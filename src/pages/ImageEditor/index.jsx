import React, { PureComponent } from 'react';
import { fabric } from 'fabric';
import _ from 'lodash';
import ToolBar from './ToolBar';
import style from './index.less';

fabric.Object.prototype.set({
  transparentCorners: false,
  hasBorders: true,
  cornerColor: '#00ffff',
  borderColor: 'red',
  cornerSize: 8,
  padding: 3,
  cornerStyle: 'circle',
  borderDashArray: [3, 3],
});

class ImageEditor extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      translateX: 0,
      translateY: 0,
      scrollScale: 1,
    };
    this.canvas = null;
    this.drawPanel = null;
    this.moving = false;
    this.lastX = null;
    this.lastY = null;
  }

  componentDidMount() {
    this.canvas = new fabric.Canvas('c', {
      preserveObjectStacking: true,
      backgroundColor: 'rgba(0,0,0,0.3)',
      perPixelTargetFind: true,
      targetFindTolerance: 10,
      hoverCursor: 'pointer',
    });

    this.drawPanel.onmouseup = e => this.onMouseUp(e);
    this.drawPanel.onmousemove = e => this.onMouseMove(e);
  }

  componentDidUpdate(prevProps) {
    const { imageURL } = this.props;
    if (imageURL !== prevProps.imageURL && imageURL) {
      const imgURL = imageURL;
      fabric.Image.fromURL(
        imgURL,
        oImg => {
          const maxWidth = Math.min(oImg.width, this.drawPanel.clientWidth);
          const maxHeight = Math.min(oImg.height, this.drawPanel.clientHeight);
          const ratio = Math.max(_.divide(oImg.width, maxWidth), _.divide(oImg.height, maxHeight));
          const initWH = {
            width: _.divide(oImg.width, ratio),
            height: _.divide(oImg.height, ratio),
          };

          this.canvas.setWidth(initWH.width);
          this.canvas.setHeight(initWH.height);

          this.canvas.setBackgroundImage(oImg, this.canvas.renderAll.bind(this.canvas), {
            scaleY: _.divide(1, ratio),
            scaleX: _.divide(1, ratio),
          });

          this.setState({ scrollScale: ratio });
        },
        {
          crossorigin: 'Anonymous',
        },
      );
    }
  }

  onMouseDown() {
    this.moving = true;
    this.drawPanel.style.cursor = 'move';
    this.canvas.selection = false;
  }

  onMouseUp() {
    this.moving = false;
    this.drawPanel.style.cursor = 'default';
    this.lastX = null;
    this.lastY = null;
  }

  onMouseMove(e) {
    if (this.moving) {
      e.preventDefault();
      e.stopPropagation();
      if (this.lastX && this.lastY) {
        const dx = e.clientX - this.lastX;
        const dy = e.clientY - this.lastY;
        this.setState({
          translateX: this.state.translateX + dx,
          translateY: this.state.translateY + dy,
        });
      }
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    }
  }

  handleScroll = e => {
    const bi = this.canvas.backgroundImage;
    if (!bi) {
      return;
    }
    const step = 0.1;
    const delta = e.nativeEvent.deltaY > 0 ? step : -step;
    const zoom = delta + 1;

    const finalHeight = _.multiply(this.canvas.getHeight(), zoom);
    const finalWidth = _.multiply(this.canvas.getWidth(), zoom);
    if (finalWidth > 6000 || finalHeight > 6000) {
      return;
    }
    this.canvas.setHeight(finalHeight);
    this.canvas.setWidth(finalWidth);

    bi.scaleX *= zoom;
    bi.scaleY *= zoom;

    const objects = this.canvas.getObjects();
    _.each(objects, object => {
      object.scaleX *= zoom;
      object.scaleY *= zoom;
      object.left *= zoom;
      object.top *= zoom;

      object.setCoords();
    });

    this.canvas.calcOffset();
    this.canvas.renderAll();

    this.setState({ scrollScale: bi.scaleX });
  };

  render() {
    return (
      <div className={style.box}>
        <ToolBar
          canvas={this.canvas}
          scrollScale={this.state.scrollScale}
          upload={this.props.upload}
        />
        <div
          className={style.drawPanel}
          ref={node => {
            this.drawPanel = node;
          }}
          onMouseDown={e => this.onMouseDown(e)}
          onWheel={e => this.handleScroll(e)}
        >
          <div
            className={style.canvasDiv}
            style={{
              transform: `translateX(${this.state.translateX}px)translateY(${
                this.state.translateY
              }px)`,
            }}
          >
            <canvas id="c" />
          </div>
        </div>
      </div>
    );
  }
}
export default ImageEditor;
