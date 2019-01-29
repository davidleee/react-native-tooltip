// @flow
//
// Modified from react-native-popover-tooltip
// https://github.com/wookoinc/react-native-popover-tooltip

import type {
  StyleObj,
} from 'react-native/Libraries/StyleSheet/StyleSheetTypes'

import * as React from 'react'
import {
  View,
  Modal,
  Animated,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Text,
  ViewPropTypes,
} from 'react-native'
import PropTypes from 'prop-types'
import invariant from 'invariant'

import TooltipItem, { type Label, labelPropType } from './TooltipItem'

const window = Dimensions.get('window')

type Props = {
  buttonComponent: React.Node,
  buttonComponentExpandRatio: number,
  buttonComponentModalOffset: number,
  items: $ReadOnlyArray<{ +label: Label, onPress: () => void }>,
  componentWrapperStyle?: StyleObj,
  overlayStyle?: StyleObj,
  tooltipContainerStyle?: StyleObj,
  tooltipContainerOffset: number,
  labelContainerStyle?: StyleObj,
  labelSeparatorColor: string,
  labelStyle?: StyleObj,
  setBelow: bool,
  animationType?: "timing" | "spring",
  onRequestClose: () => void,
  triangleOffset: number,
  delayLongPress: number,
  onOpenTooltipMenu?: () => void,
  onCloseTooltipMenu?: () => void,
  onPress?: () => void,
  componentContainerStyle?: StyleObj,
  timingConfig?: { duration?: number },
  springConfig?: { tension?: number, friction?: number },
  opacityChangeDuration?: number,
};
type State = {
  isModalOpen: bool,
  x: number,
  y: number,
  width: number,
  height: number,
  opacity: Animated.Value,
  tooltipContainerScale: Animated.Value,
  buttonComponentContainerScale: number | Animated.Interpolation,
  tooltipTriangleDown: bool,
  tooltipTriangleLeftMargin: number,
  triangleOffset: number,
  willPopUp: bool,
  oppositeOpacity: ?Animated.Interpolation,
  tooltipContainerX: ?Animated.Interpolation,
  tooltipContainerY: ?Animated.Interpolation,
  buttonComponentOpacity: number,
};
class Tooltip extends React.PureComponent<Props, State> {
  static propTypes = {
    buttonComponent: PropTypes.node.isRequired,
    buttonComponentExpandRatio: PropTypes.number,
    buttonComponentModalOffset: PropTypes.number,
    items: PropTypes.arrayOf(PropTypes.shape({
      label: labelPropType.isRequired,
      onPress: PropTypes.func.isRequired,
    })).isRequired,
    componentWrapperStyle: ViewPropTypes.style,
    overlayStyle: ViewPropTypes.style,
    tooltipContainerStyle: ViewPropTypes.style,
    tooltipContainerOffset: PropTypes.number,
    labelContainerStyle: ViewPropTypes.style,
    labelSeparatorColor: PropTypes.string,
    labelStyle: Text.propTypes.style,
    setBelow: PropTypes.bool,
    animationType: PropTypes.oneOf(['timing', 'spring']),
    onRequestClose: PropTypes.func,
    triangleOffset: PropTypes.number,
    delayLongPress: PropTypes.number,
    onOpenTooltipMenu: PropTypes.func,
    onCloseTooltipMenu: PropTypes.func,
    onPress: PropTypes.func,
    componentContainerStyle: ViewPropTypes.style,
    timingConfig: PropTypes.object,
    springConfig: PropTypes.object,
    opacityChangeDuration: PropTypes.number,
  };

  static defaultProps = {
    buttonComponentExpandRatio: 1.0,
    buttonComponentModalOffset: 0,
    tooltipContainerOffset: 0,
    labelSeparatorColor: '#E1E1E1',
    onRequestClose: () => {},
    setBelow: false,
    delayLongPress: 100,
    triangleOffset: 0,
  };

  wrapperComponent: ?TouchableOpacity;

  constructor(props: Props) {
    super(props)
    this.state = {
      isModalOpen: false,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      opacity: new Animated.Value(0),
      tooltipContainerScale: new Animated.Value(0),
      buttonComponentContainerScale: 1,
      tooltipTriangleDown: !props.setBelow,
      tooltipTriangleLeftMargin: 0,
      triangleOffset: props.triangleOffset,
      willPopUp: false,
      oppositeOpacity: undefined,
      tooltipContainerX: undefined,
      tooltipContainerY: undefined,
      buttonComponentOpacity: 0,
    }
  }

  componentDidMount() {
    // 绑定到 opacity 上，跟 opacity 来个相反的操作
    // 用来实现：在某些东西逐渐出现的同时逐渐消失
    const newOppositeOpacity = this.state.opacity.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    })
    this.setState({ oppositeOpacity: newOppositeOpacity })
  }

  toggleModal = () => {
    this.setState({ isModalOpen: !this.state.isModalOpen })
  }

  openModal = () => {
    this.setState({ willPopUp: true })
    this.toggleModal()
    this.props.onOpenTooltipMenu && this.props.onOpenTooltipMenu()
  }

  hideModal = () => {
    // 避免多余的 layout 计算
    this.setState({ willPopUp: false })
    this.showZoomingOutAnimation()
    this.props.onCloseTooltipMenu && this.props.onCloseTooltipMenu()
  }

  onPressItem = (userCallback: () => void) => {
    this.toggle()
    userCallback()
  }

  onInnerContainerLayout = (
    event: { nativeEvent: { layout: { height: number, width: number } } },
  ) => {
    // 弹出框的宽高
    const tooltipContainerWidth = event.nativeEvent.layout.width
    const tooltipContainerHeight = event.nativeEvent.layout.height
    if (
      !this.state.willPopUp
      || tooltipContainerWidth === 0
      || tooltipContainerHeight === 0
    ) {
      return
    }

    const componentWrapper = this.wrapperComponent
    invariant(componentWrapper, 'should be set')
    // 触发弹出框的视图(buttonComponent)的位置信息
    componentWrapper.measure((x, y, width, height, pageX, pageY) => {
      console.log(`wrapper properties: (width: ${width}, height: ${height}, pX: ${pageX}, pY: ${pageY})`)
      // 计算弹出框的最右侧坐标 tooltip.maxX
      const fullWidth = pageX + tooltipContainerWidth
        + (width - tooltipContainerWidth) / 2
      const tooltipContainerXFinal = fullWidth > window.width
        ? window.width - tooltipContainerWidth // 如果有超出屏幕的部分，那就拉回来一点点，紧挨着屏幕边缘
        : pageX + (width - tooltipContainerWidth) / 2 // 否则就显示在我们计算出来的位置
        let { tooltipTriangleDown } = this.state
        
      const tooltipMargin = 2 // 弹出框跟触发视图之间的间距
      const tooltipMinY = pageY - tooltipContainerHeight - tooltipMargin // 弹出框在视图之上
      const tooltipMaxY = pageY + height + tooltipMargin // 弹出框在视图之下
      // 先按想要的参数来
      let tooltipContainerYFinal = tooltipTriangleDown ? tooltipMinY : tooltipMaxY
      // 想把弹出框放上面，但是上面的空间不够了
      if (tooltipTriangleDown && tooltipMinY < 0) {
        tooltipContainerYFinal = tooltipMaxY
        tooltipTriangleDown = false

      // 想把弹出框放下面，但是高度超出屏幕了
      } else if (!tooltipTriangleDown && tooltipMaxY + tooltipContainerHeight > window.height) {
        tooltipContainerYFinal = tooltipMinY
        tooltipTriangleDown = true
      }

      // 制作动画效果：不管 scale 怎么变，横坐标都不变
      const tooltipContainerX = this.state.tooltipContainerScale.interpolate({
        inputRange: [0, 1],
        outputRange: [tooltipContainerXFinal, tooltipContainerXFinal],
      })

      // 制作动画效果：随着弹出框的放大，弹出框的纵坐标也变化，实现从触发视图里弹出来的效果
      const tooltipContainerY = this.state.tooltipContainerScale.interpolate({
        inputRange: [0, 1],
        outputRange: [
          tooltipTriangleDown ? pageY - height : pageY, // 实现发现，动画从触发视图距离较远的那条边开始会比较自然
          tooltipContainerYFinal,
        ],
      })

      // 这是一个设计上的参数，估计原来的设计是这样的：
      // 考虑到弹出框是模态的（Modal），所以可以把背景模糊掉，只突出弹出框和触发视图，实现一个更纯粹的视觉效果
      // 既然要把触发视图搬到模态视图上面去，那何不加点动画效果来优化这个转化过程呢？
      const buttonComponentContainerScale = this.state.tooltipContainerScale.interpolate({
        inputRange: [0, 1],
        outputRange: [1, this.props.buttonComponentExpandRatio],
      })

      // 小三角距离整个弹出框左边的距离
      const tooltipTriangleLeftMargin = pageX + width / 2 - tooltipContainerXFinal - 10

      // 把所有算好的数据放到 state 里，在 render 里面再用
      this.setState(
        {
          x: pageX,
          y: pageY,
          width,
          height,
          tooltipContainerX,
          tooltipContainerY,
          tooltipTriangleDown,
          tooltipTriangleLeftMargin,
          buttonComponentContainerScale,
          buttonComponentOpacity: 1, // 默认值是 0，在计算完成之后置为 1，实现 render 里的注释说的那种逻辑
        },
        this.showZoomingInAnimation, // 数据更新好之后，执行弹框出现的动画
      )
    })
    this.setState({ willPopUp: false })
  }

  render() {
    // 构建弹出框的 style 属性
    const tooltipContainerStyle = {
      left: this.state.tooltipContainerX,
      top: this.state.tooltipContainerY,
      transform: [
        { scale: this.state.tooltipContainerScale },
      ],
    }

    // 把弹出框要显示的内容转化为 TooltipItem
    const items = this.props.items.map((item, index) => {
      const classes = [this.props.labelContainerStyle]

      if (index !== this.props.items.length - 1) {
        classes.push([
          styles.tooltipMargin,
          { borderBottomColor: this.props.labelSeparatorColor },
        ])
      }

      return (
        <TooltipItem
          key={index}
          label={item.label}
          onPressUserCallback={item.onPress}
          onPress={this.onPressItem}
          containerStyle={classes}
          labelStyle={this.props.labelStyle}
        />
      )
    })

    // 让小三角的颜色跟弹出框的背景色一致
    const { labelContainerStyle } = this.props
    const borderStyle = labelContainerStyle && labelContainerStyle.backgroundColor
      ? (
        // 小三角是通过 border 来实现的，方向不同时用到的 border 也不同
        this.state.tooltipTriangleDown 
        ? { borderTopColor: labelContainerStyle.backgroundColor } 
        : { borderBottomColor: labelContainerStyle.backgroundColor }
      ) : null
    let triangleDown = null
    let triangleUp = null
    if (this.state.tooltipTriangleDown) {
      triangleDown = (
        <View style={[
          styles.triangleDown,
          {
            marginLeft: this.state.tooltipTriangleLeftMargin,
            left: this.state.triangleOffset,
          },
          borderStyle,
        ]} />
      )
    } else {
      triangleUp = (
        <View style={[
          styles.triangleUp,
          {
            marginLeft: this.state.tooltipTriangleLeftMargin,
            left: this.state.triangleOffset,
          },
          borderStyle
        ]} />
      )
    }

    return (
      <TouchableOpacity
        ref={this.wrapperRef}
        style={this.props.componentWrapperStyle}
        onPress={this.props.onPress}
        onLongPress={this.toggle}
        delayLongPress={this.props.delayLongPress}
        activeOpacity={1.0}
      >
        <Animated.View style={[
          // { opacity: this.state.oppositeOpacity },
          this.props.componentContainerStyle,
        ]}>
          {this.props.buttonComponent}
        </Animated.View>
        <Modal
          visible={this.state.isModalOpen}
          onRequestClose={this.props.onRequestClose}
          transparent
        >
          <Animated.View style={[
            styles.overlay,
            this.props.overlayStyle,
            { opacity: this.state.opacity },
          ]}>
            <TouchableOpacity
              activeOpacity={1}
              focusedOpacity={1}
              style={styles.button}
              onPress={this.toggle}
            >
              <Animated.View
                style={[
                  styles.tooltipContainer,
                  this.props.tooltipContainerStyle,
                  tooltipContainerStyle,
                ]}
              >
                <View
                  onLayout={this.onInnerContainerLayout}
                  style={styles.innerContainer}
                >
                  {triangleUp}
                  <View style={[
                    styles.allItemContainer,
                    this.props.tooltipContainerStyle,
                  ]}>
                    {items}
                  </View>
                  {triangleDown}
                </View>
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>
          {/* <Animated.View style={[
            styles.absoluteAnimatedView,
            {
              left: this.state.x,
              top: this.state.y - this.props.buttonComponentModalOffset,
              width: this.state.width,
              height: this.state.height,
              opacity: this.state.buttonComponentOpacity, // At the first frame, the button will be rendered
              // in the top-left corner. So we dont render it
              // until its position has been calculated.
              transform: [
                { scale: this.state.buttonComponentContainerScale },
              ],
            }]}>
            <TouchableOpacity
              onPress={this.toggle}
              activeOpacity={1.0}
            >
              {this.props.buttonComponent}
            </TouchableOpacity>
          </Animated.View> */}
        </Modal>
      </TouchableOpacity>
    )
  }

  wrapperRef = (wrapperComponent: ?TouchableOpacity) => {
    this.wrapperComponent = wrapperComponent
  }

  // 弹框出现动画
  showZoomingInAnimation = () => {
    let tooltipAnimation = Animated.timing(
      this.state.tooltipContainerScale,
      {
        toValue: 1,
        duration: this.props.timingConfig && this.props.timingConfig.duration
          ? this.props.timingConfig.duration
          : 200,
      }
    )
    if (this.props.animationType === 'spring') {
      tooltipAnimation = Animated.spring(
        this.state.tooltipContainerScale,
        {
          toValue: 1,
          tension: this.props.springConfig && this.props.springConfig.tension
            ? this.props.springConfig.tension
            : 100,
          friction: this.props.springConfig && this.props.springConfig.friction
            ? this.props.springConfig.friction
            : 7,
        },
      )
    }
    Animated.parallel([
      tooltipAnimation,
      Animated.timing(
        this.state.opacity,
        {
          toValue: 1,
          duration: this.props.opacityChangeDuration
            ? this.props.opacityChangeDuration
            : 200,
        },
      ),
    ]).start()
  }

  // 弹框消失动画
  showZoomingOutAnimation() {
    Animated.parallel([
      Animated.timing(
        this.state.tooltipContainerScale,
        {
          toValue: 0,
          duration: this.props.opacityChangeDuration
            ? this.props.opacityChangeDuration
            : 200,
        },
      ),
      Animated.timing(
        this.state.opacity,
        {
          toValue: 0,
          duration: this.props.opacityChangeDuration
            ? this.props.opacityChangeDuration
            : 200,
        },
      ),
    ]).start(this.toggleModal)
  }

  toggle = () => {
    if (this.state.isModalOpen) {
      this.hideModal()
    } else {
      this.openModal()
    }
  }
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'transparent',
    flex: 1,
  },
  innerContainer: {
    backgroundColor: 'transparent',
    alignItems: 'flex-start'
  },
  tooltipMargin: {
    borderBottomWidth: 1,
  },
  tooltipContainer: {
    backgroundColor: 'transparent',
    position: 'absolute',
  },
  // 这个神奇的小三角实现很值得写一篇博客来解释
  triangleDown: {
    width: 10,
    height: 10,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 0,
    borderLeftWidth: 10,
    borderTopColor: 'white',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  triangleUp: {
    width: 10,
    height: 10,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 0,
    borderRightWidth: 10,
    borderBottomWidth: 10,
    borderLeftWidth: 10,
    borderBottomColor: 'white',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  button: {
    flex: 1,
  },
  allItemContainer: {
    borderRadius: 5,
    backgroundColor: 'white',
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  absoluteAnimatedView: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
})

export default Tooltip
