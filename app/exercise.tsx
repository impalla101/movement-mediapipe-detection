import React, { useEffect } from "react";
import { Platform, StyleSheet, Text } from "react-native";
import {
	Camera,
	useCameraDevice,
	useCameraPermission,
} from "react-native-vision-camera";

export default function Exercise() {
	const device = useCameraDevice("front");
	const { hasPermission, requestPermission } = useCameraPermission();

	useEffect(() => {
		requestPermission().catch((error) => console.log(error));
	}, [requestPermission]);

	if (!hasPermission) {
		return <Text>No permission</Text>;
	}

	if (device == null) {
		return <Text>No device</Text>;
	}

	const pixelFormat = Platform.OS === "ios" ? "rgb" : "yuv";

	return (
		<Camera
			style={StyleSheet.absoluteFill}
			device={device}
			isActive={true}
			pixelFormat={pixelFormat}
		/>
	);
}
