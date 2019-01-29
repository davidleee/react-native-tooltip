# react-native-tooltip

> Modified from [react-native-popover-tooltip](https://github.com/wookoinc/react-native-popover-tooltip)

A custom tooltip view for react-native apps.

## Getting Started

### Prerequisites

This is a component for react-native ONLY! Tweaks should be made if you want to use it somewhere else.

### Installing

Just copy the whole *Tooltips* folder into your project's directory and import.

```
import Tooltip from './Tooltip'
```

Here is an example of how to use it:

```
<Tooltip
  buttonComponent={
    <Text style={styles.welcome}>Welcome to React Native!</Text>
  }
  items={[
    { label: 'copy', onPress: () => {} }
  ]}
/>
```

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

* this project is built to learn the main structure of code of [react-native-popover-tooltip](https://github.com/wookoinc/react-native-popover-tooltip), during the learning I've make some improvment and bugfix :)
* the comments inside *index.js* are written in Chinese, if anyone needs an English version, just let me know.
