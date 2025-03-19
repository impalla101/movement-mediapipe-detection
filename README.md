# movement

Project made with expo/React Native to keep track of human body movement

# Welcome to your Expo app 👋

This project was made to learn how to use MediPipe with React Native. The UI is super ugly but functional. I have faced some weird bug with the `react-native-vision-camera@4.6.4` (the latest version at the moment of this publishing), where the Camera component for some reason was getting the wrong orientation and causing a crash when using `useSkiaFrameProcessor`. You can find the issue opened [here](https://github.com/mrousavy/react-native-vision-camera/issues/2951).

## Get started

1. Install dependencies

   ```bash
   yarn
   ```

2. Start the app

   ```bash
    npx expo -c
   ```

   For android, you need to have [NDK in your environment variables](https://shopify.github.io/react-native-skia/docs/getting-started/installation/#android)
   In another terminal run for each OS

   ```bash
   yarn android
   yarn ios
   ```

   If you find some `buildCMakeDebug[arm64-v8a]` error while building the Android app, go to android folder and run

   ```bash
   /gradlew clean && rm -rf gradle
   ```
