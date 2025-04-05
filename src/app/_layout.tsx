import { Stack } from "expo-router";
import { COLORS } from "../constants/theme";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export default function RootLayout() {
	return (
		<SafeAreaProvider>
			<SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
				<Stack screenOptions={{ headerShown: false }} />
			</SafeAreaView>
		</SafeAreaProvider>
	);
		
}
