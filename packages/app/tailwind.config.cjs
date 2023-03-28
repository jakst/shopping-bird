const defaultTheme = require("tailwindcss/defaultTheme")
const { slate, slateDark, bronzeDark, indigoDark } = require("@radix-ui/colors")

const themes = {
	slateLight: {
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
	},
	slateDark: {
		color1: slateDark.slate1,
		color2: slateDark.slate2,
		color3: slateDark.slate3,
		color4: slateDark.slate4,
		color5: slateDark.slate5,
		color6: slateDark.slate6,
		color7: slateDark.slate7,
		color8: slateDark.slate8,
		color9: slateDark.slate9,
		color10: slateDark.slate10,
		color11: slateDark.slate11,
		color12: slateDark.slate12,
	},
	bronzeDark: {
		color1: bronzeDark.bronze1,
		color2: bronzeDark.bronze2,
		color3: bronzeDark.bronze3,
		color4: bronzeDark.bronze4,
		color5: bronzeDark.bronze5,
		color6: bronzeDark.bronze6,
		color7: bronzeDark.bronze7,
		color8: bronzeDark.bronze8,
		color9: bronzeDark.bronze9,
		color10: bronzeDark.bronze10,
		color11: bronzeDark.bronze11,
		color12: bronzeDark.bronze12,
	},
	// const blueDark = {
	// 	blue1: '#0f1720',
	// 	blue2: '#0f1b2d',
	// 	blue3: '#10243e',
	// 	blue4: '#102a4c',
	// 	blue5: '#0f3058',
	// 	blue6: '#0d3868',
	// 	blue7: '#0a4481',
	// 	blue8: '#0954a5',
	// 	blue9: '#0091ff',
	// 	blue10: '#369eff',
	// 	blue11: '#52a9ff',
	// 	blue12: '#eaf6ff',
	// }
	// const indigoDark = {
	// 	indigo1: '#131620',
	// 	indigo2: '#15192d',
	// 	indigo3: '#192140',
	// 	indigo4: '#1c274f',
	// 	indigo5: '#1f2c5c',
	// 	indigo6: '#22346e',
	// 	indigo7: '#273e89',
	// 	indigo8: '#2f4eb2',
	// 	indigo9: '#3e63dd',
	// 	indigo10: '#5373e7',
	// 	indigo11: '#849dff',
	// 	indigo12: '#eef1fd',
	// }
	indigoDark: {
		color1: indigoDark.indigo1,
		color2: indigoDark.indigo2,
		color3: indigoDark.indigo3,
		color4: indigoDark.indigo4,
		color5: indigoDark.indigo5,
		color6: indigoDark.indigo6,
		color7: indigoDark.indigo7,
		color8: indigoDark.indigo8,
		color9: indigoDark.indigo9,
		color10: indigoDark.indigo10,
		color11: indigoDark.indigo11,
		color12: indigoDark.indigo12,
	},
}

/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/**/*.{html,js,jsx,ts,tsx}"],
	theme: {
		colors: {
			transparent: "transparent",
			...themes.slateDark,
		},
		extend: {
			fontFamily: {
				sans: ["Hubot Sans", ...defaultTheme.fontFamily.sans],
			},
		},
	},
	plugins: [],
}
