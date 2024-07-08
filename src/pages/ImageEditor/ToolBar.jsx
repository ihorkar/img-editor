/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React from 'react';
import { Icon, Popover, Radio, Divider } from 'antd';
import { fabric } from 'fabric';
import _ from 'lodash';
import classnames from 'classnames';
import style from './ToolBar.less';

const Icons = [
  { name: '绘制',icon: require('assets/svgIcons/画笔.svg').default },
  { name: '箭头',icon: require('assets/svgIcons/箭头.svg').default },
  { name: '直线',icon: require('assets/svgIcons/直线.svg').default },
  { name: '虚线',icon: require('assets/svgIcons/虚线.svg').default },
  { name: '矩形',icon: require('assets/svgIcons/矩形.svg').default },
  { name: '椭圆',icon: require('assets/svgIcons/椭圆.svg').default },
  { name: '文本',icon: require('assets/svgIcons/文字.svg').default },
  { name: '删除',icon: require('assets/svgIcons/垃圾桶.svg').default },
];

const drawWidthArray = [
  { size: 1, title: '小号' },
  { size: 2, title: '普通' },
  { size: 4, title: '大号' },
];

class MenuBar extends React.PureComponent {
  state = {
    liChecked: '',
    color: 'red',
    drawWidthArray,
    drawWidthIndex: 1,
  };

  canvas = null;

  mouseFrom = {};

  mouseTo = {};

  drawingObject = null;

  componentWillReceiveProps(newProps) {
    if (newProps.canvas && newProps.canvas !== this.props.canvas) {
      this.canvas = newProps.canvas;

      let doDrawing = false;
      this.canvas.on('mouse:down', options => {
        if (this.state.liChecked || this.canvas.getActiveObject()) {
          options.e.preventDefault();
          options.e.stopPropagation();
          if (this.state.liChecked) {
            doDrawing = true;
            this.mouseFrom = this.canvas.getPointer(options.e);
            this.onceTrigger();
          }
        }
      });
      this.canvas.on(
        'mouse:move',
        _.debounce(options => {
          if (doDrawing) {
            options.e.preventDefault();
            options.e.stopPropagation();
            this.mouseTo = this.canvas.getPointer(options.e);
            this.keepTrigger();
          }
        }, 7)
      );
      this.canvas.on('mouse:up', () => {
        this.drawingObject = null;
        doDrawing = false;
      });

      this.canvas.on('selection:created', options => {
        if (this.state.liChecked === '删除') {
          if (options.selected) {
            const etCount = options.selected.length;
            for (let etindex = 0; etindex < etCount; etindex++) {
              this.canvas.remove(options.selected[etindex]);
            }
          }
          this.canvas.discardActiveObject().renderAll();
        }
      });

    }

    if (newProps.scrollScale && newProps.scrollScale !== this.props.scrollScale) {
      const _scale = newProps.scrollScale;
      const _drawWidthArray = _.map(drawWidthArray, obj => ({
        ...obj,
        size: obj.size * _scale,
      }));
      this.setState({
        drawWidthArray: _drawWidthArray,
      });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.color !== this.state.color) {
      this.canvas.freeDrawingBrush.color = this.state.color;
    }
    if (
      prevState.drawWidthIndex !== this.state.drawWidthIndex ||
      prevState.drawWidthArray !== this.state.drawWidthArray
    ) {
      this.canvas.freeDrawingBrush.width = this.state.drawWidthArray[
        this.state.drawWidthIndex
      ].size;
    }
  }

  componentWillUnmount() {
    this.canvas.removeListeners();
    this.canvas = null;
  }

  liClick = name => {
    let checked = null;
    if (this.state.liChecked !== name) {
      checked = name;
    }
    this.setState({
      liChecked: checked,
    });

    this.canvas.isDrawingMode = false;
    this.canvas.discardActiveObject().renderAll();
    this.canvas.skipTargetFind = true;
    this.canvas.selection = false;

    if (checked === '绘制') {
      this.canvas.isDrawingMode = true;
      this.canvas.freeDrawingBrush.color = this.state.color;
      this.canvas.freeDrawingBrush.width = this.state.drawWidthArray[
        this.state.drawWidthIndex
      ].size;
    } else if (checked === '删除' || checked === null) {
      this.canvas.selectable = true;
      this.canvas.selection = true;
      this.canvas.skipTargetFind = false;
    }
  };

  onceTrigger = () => {
    if (this.state.liChecked) {
      const f_x = this.mouseFrom.x;
      const f_y = this.mouseFrom.y;
      switch (this.state.liChecked) {
        case '文本': {
          const textbox = new fabric.Textbox('Hello', {
            left: f_x,
            top: f_y,
            width: 100,
            hasControls: true,
            fontSize: 18,
            fill: this.state.color,
          });
          this.canvas.add(textbox);
          break;
        }
        default:
          break;
      }
    }
  };

  keepTrigger = () => {
    if (this.drawingObject) {
      this.canvas.remove(this.drawingObject);
    }

    const f_x = this.mouseFrom.x;
    const f_y = this.mouseFrom.y;
    const t_x = this.mouseTo.x;
    const t_y = this.mouseTo.y;

    const options = {
      stroke: this.state.color,
      strokeWidth: this.state.drawWidthArray[this.state.drawWidthIndex].size,
    };

    let path = null;
    switch (this.state.liChecked) {
      case '箭头':
        path = this.drawArrow(f_x, f_y, t_x, t_y, 30, _.multiply(10, options.strokeWidth));
        this.drawingObject = new fabric.Path(path, {
          fill: 'rgba(255,255,255,0)',
          ...options,
        });
        break;
      case '直线':
        path = [f_x, f_y, t_x, t_y];
        this.drawingObject = new fabric.Line(path, {
          ...options,
        });
        break;
      case '虚线':
        path = [f_x, f_y, t_x, t_y];
        this.drawingObject = new fabric.Line(path, {
          strokeDashArray: [options.strokeWidth * 3, options.strokeWidth],
          ...options,
        });
        break;
      case '椭圆': {
        let rx = Math.abs(f_x - t_x) / 2;
        let ry = Math.abs(f_y - t_y) / 2;
        if (rx > options.strokeWidth) {
          rx -= options.strokeWidth / 2;
        }
        if (ry > options.strokeWidth) {
          ry -= options.strokeWidth / 2;
        }

        let originX = null;
        if (f_x > t_x) {
          originX = 'right';
        } else {
          originX = 'left';
        }
        let originY = null;
        if (f_y > t_y) {
          originY = 'bottom';
        } else {
          originY = 'top';
        }

        // const radius = Math.sqrt((t_x - f_x) * (t_x - f_x) + (t_y - f_y) * (t_y - f_y)) / 2;
        this.drawingObject = new fabric.Ellipse({
          left: f_x,
          top: f_y,
          originX,
          originY,
          rx,
          ry,
          angle: 0,
          fill: 'rgba(255, 255, 255, 0)',
          ...options,
        });
        break;
      }
      case '矩形': {
        path = `M ${f_x} ${f_y} L ${t_x} ${f_y} L ${t_x} ${t_y} L ${f_x} ${t_y} L ${f_x} ${f_y} z`;
        this.drawingObject = new fabric.Path(path, {
          fill: 'rgba(255, 255, 255, 0)',
          ...options,
        });
        break;
      }
      default:
        break;
    }
    if (this.drawingObject) {
      this.canvas.add(this.drawingObject);
      this.canvas.renderAll();
    }
  };

  drawArrow = (fromX, fromY, toX, toY, theta, headlen) => {
    theta = typeof theta !== 'undefined' ? theta : 30;
    headlen = typeof theta !== 'undefined' ? headlen : 20;
    const angle = (Math.atan2(fromY - toY, fromX - toX) * 180) / Math.PI;
    const angle1 = ((angle + theta) * Math.PI) / 180;
    const angle2 = ((angle - theta) * Math.PI) / 180;
    const topX = headlen * Math.cos(angle1);
    const topY = headlen * Math.sin(angle1);
    const botX = headlen * Math.cos(angle2);
    const botY = headlen * Math.sin(angle2);
    let arrowX = fromX - topX;

    let arrowY = fromY - topY;
    let path = ` M ${fromX} ${fromY}`;
    path += ` L ${toX} ${toY}`;
    arrowX = toX + topX;
    arrowY = toY + topY;
    path += ` M ${arrowX} ${arrowY}`;
    path += ` L ${toX} ${toY}`;
    arrowX = toX + botX;
    arrowY = toY + botY;
    path += ` L ${arrowX} ${arrowY}`;
    return path;
  };

  colorPicker = color => {
    this.setState({
      color,
    });
  };

  sizePicker = index => {
    this.setState({ drawWidthIndex: index });
  };

  reRenderCanvasByScale = scale => {
    this.canvas.setHeight(this.canvas.getHeight() * scale);
    this.canvas.setWidth(this.canvas.getWidth() * scale);

    if (this.canvas.backgroundImage) {
      const bi = this.canvas.backgroundImage;
      bi.scaleX *= scale;
      bi.scaleY *= scale;
    }

    const objects = this.canvas.getObjects();
    _.each(objects, object => {
      object.scaleX *= scale;
      object.scaleY *= scale;
      object.left *= scale;
      object.top *= scale;
      object.setCoords();
    });
    this.canvas.calcOffset();
    this.canvas.renderAll();
  };

  submitClick = () => {
    const _scale = 1 / this.canvas.backgroundImage.scaleX;
    this.reRenderCanvasByScale(_scale);
    this.setState({
      drawWidthArray,
    });

    const dataURL = this.canvas.toDataURL({
      format: 'png',
      enableRetinaScaling: true,
      multiplier: 1,
    });
    if (typeof this.props.upload === 'function') {
      this.props.upload(dataURL);
    }
  };

  originImageClick = () => {
    const _scale = 1 / this.canvas.backgroundImage.scaleX;
    this.reRenderCanvasByScale(_scale);
    this.setState({
      drawWidthArray,
    });
  };

  render() {
    return (
      <div className={style.box}>
        <ul>
          <li className={style.li}>
            <Popover
              placement="right"
              content={
                <Radio.Group size="large" value={this.state.color}>
                  {_.map(['red', 'blue', 'yellow', 'green'], _color => (
                    <Radio.Button
                      key={_color}
                      value={_color}
                      onClick={this.colorPicker.bind(this, _color)}
                    >
                      <Icon component={require('assets/svgIcons/颜色.svg').default} style={{ color: _color, fontSize: '25px' }} />
                    </Radio.Button>
                  ))}
                </Radio.Group>
              }
            >
              <Icon component={require('assets/svgIcons/颜色.svg').default} style={{ color: this.state.color }} />
            </Popover>
          </li>
          <li className={style.li}>
            <Popover
              placement="right"
              content={
                <Radio.Group size="large" value={this.state.drawWidthIndex}>
                  {_.map(this.state.drawWidthArray, ({ title }, i) => (
                    <Radio.Button key={i} value={i} onClick={this.sizePicker.bind(this, i)}>
                      {title}
                    </Radio.Button>
                  ))}
                </Radio.Group>
              }
            >
              <Icon component={require('assets/svgIcons/粗体.svg').default} />
            </Popover>
          </li>
          <Divider />
          {_.reduce(
            Icons,
            (result, item, i) => {
              result.push(
                <li
                  key={i}
                  onClick={() => {
                    this.liClick(item.name);
                  }}
                  title={item.name}
                  className={classnames([
                    style.li,
                    { [style.focus]: item.name === this.state.liChecked },
                  ])}
                >
                  <Icon component={item.icon} />
                </li>
              );
              return result;
            },
            []
          )}
        </ul>
        <ul>
          <li onClick={() => this.originImageClick()} title="原图" className={style.li}>
            <Icon component={require('assets/svgIcons/原图.svg').default} />
          </li>
          <li onClick={() => this.submitClick()} title="提交" className={style.li}>
            <Icon component={require('assets/svgIcons/提交.svg').default} />
          </li>
        </ul>
      </div>
    );
  }
}

export default MenuBar;
