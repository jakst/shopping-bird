const defaultTheme = require("tailwindcss/defaultTheme")
const { slate } = require("@radix-ui/colors")

const colorsSlate = {
	color1: slate.slate1,
	color2: slate.slate2,
	color3: slate.slate3,
	color4: slate.slate4,
	color5: slate.slate5,
	color6: slate.slate6,
	color7: slate.slate7,
	color8: slate.slate8,
	color9: slate.slate9,
	color10: slate.slate10,
	color11: slate.slate11,
	color12: slate.slate12,
}

/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/**/*.{html,js,jsx,ts,tsx}"],
	theme: {
		colors: {
			transparent: "transparent",
			...colorsSlate,
		},
		extend: {
			fontFamily: {
				sans: ["Hubot Sans", ...defaultTheme.fontFamily.sans],
			},
		},
	},
	plugins: [],
}
