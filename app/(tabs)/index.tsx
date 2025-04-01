import { Link } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

export default function Page() {
	return (
		//Very ugly and simple UI and style :)
		<View
			style={{
				flex: 1,
				justifyContent: "center",
				alignItems: "center",
			}}
		>
			<Text style={{ fontSize: 22 }}>Welcome to FitRep</Text>
			<Text style={{ fontSize: 16 }}>It's time to train!</Text>
			<Link href="/exercise" asChild>
				<TouchableOpacity
					style={{
						borderColor: "black",
						borderWidth: 1,
						borderRadius: 5,
						paddingHorizontal: 40,
						paddingVertical: 10,
						margin: 20,
					}}
				>
					<Text style={{ fontSize: 16 }}>Start</Text>
				</TouchableOpacity>
			</Link>
		</View>
	);
}
