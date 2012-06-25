const Lang = imports.lang;
const GLib = imports.gi.GLib;
const Main = imports.ui.main;
const Signals = imports.signals;

const BackgroundMatcher = new Lang.Class({
	Name: "BackgroundMatcher",

	_init: function() {
		this.enabled = false;
		this.backgroundColor = null;
	},

	enable: function(enabled) {
		this.enabled = enabled;

		if (this.enabled) {
			this.backgroundColor = null;
			
			// update when the background is changed
			this.redrawConnection = Main.overview._background.connect("queue-redraw", Lang.bind(this, this.match));
		} else {
			if (this.redrawConnection) {
				Main.overview._background.disconnect(this.redrawConnection);
				this.redrawConnection = 0;
			}
		}
	},

	match: function() {
		if (!this.enabled) {
			return;
		}

		try {
			// https://bugzilla.gnome.org/show_bug.cgi?id=671750
			// http://bazaar.launchpad.net/~unity-team/unity/trunk/view/2279/plugins/unityshell/src/BGHash.cpp#L112
			this.baseColor = GLib.spawn_command_line_sync("xprop -root _GNOME_BACKGROUND_REPRESENTATIVE_COLORS");
			this.baseColor = this.baseColor[1].toString().match(/rgb\([\d,.]+\)/gi)[0].replace(/[a-z\(\)]/g, "").split(",");
			this.baseColor[0] /= 255;
			this.baseColor[1] /= 255;
			this.baseColor[2] /= 255;

			this.fixedColor = this.matchToFixedColor(this.baseColor);
			this.fixedColor = "rgba(" + this.fixedColor.join(",") + ")";

			if (this.backgroundColor !== this.fixedColor) {
				this.backgroundColor = this.fixedColor;
				this.emit("background-color-changed", this.backgroundColor);
			}
		} catch (e) {
			// global.log("background error " + e.message);
			this.backgroundColor = null;
		}
	},

	// http://bazaar.launchpad.net/~unity-team/unity/trunk/view/2279/plugins/unityshell/src/BGHash.cpp#L238
	matchToFixedColor: function(baseColor) {
		let colors = [];
		colors[ 0] = this.getRGBFromInt(0x540e44);
		colors[ 1] = this.getRGBFromInt(0x6e0b2a);
		colors[ 2] = this.getRGBFromInt(0x841617);
		colors[ 3] = this.getRGBFromInt(0x84371b);
		colors[ 4] = this.getRGBFromInt(0x864d20);
		colors[ 5] = this.getRGBFromInt(0x857f31);
		colors[ 6] = this.getRGBFromInt(0x1d6331);
		colors[ 7] = this.getRGBFromInt(0x11582e);
		colors[ 8] = this.getRGBFromInt(0x0e5955);
		colors[ 9] = this.getRGBFromInt(0x192b59);
		colors[10] = this.getRGBFromInt(0x1b134c);
		colors[11] = this.getRGBFromInt(0x2c0d46);

		let closestDiff = 200.0;
		let chosenColor = null;
		let baseHSV = RGBtoHSV(baseColor);

		if (baseHSV.saturation < 0.08) {
			// global.log("got a grayscale image");
			chosenColor = [46 / 255, 52 / 255, 54 / 255];
		} else {
			// global.log("got a colour image");
			for (let i = 0; i < colors.length; i++) {
				let comparisonHSV = RGBtoHSV(colors[i]);
				let colorDiff = Math.abs(baseHSV.hue - comparisonHSV.hue);

				if (colorDiff < closestDiff) {
					chosenColor = colors[i];
					closestDiff = colorDiff;
				}
			}

			let hsvColor = RGBtoHSV(chosenColor);
			hsvColor.saturation = Math.min(baseHSV.saturation, hsvColor.saturation) * 1.3;
			hsvColor.value = Math.min(baseHSV.value, hsvColor.value, 0.26);

			chosenColor = HSVtoRGB(hsvColor);
		}

		// return values as 0..255 from 0..1
		chosenColor[0] = parseInt(chosenColor[0] * 255);
		chosenColor[1] = parseInt(chosenColor[1] * 255);
		chosenColor[2] = parseInt(chosenColor[2] * 255);
		chosenColor[3] = 0.72;

		return chosenColor;
	},

	// helper methods
	getRGBFromInt: function(color) {
		return [((color >> 16) & 0xFF) / 255
			, ((color >> 8) & 0xFF) / 255
			, (color & 0xFF) / 255
		];
	}
});
Signals.addSignalMethods(BackgroundMatcher.prototype);

// TODO try using Clutter.Color
function RGBtoHSV(rgb) {
	let mini, maxi, delta, h, s, v;
	let [r, g, b] = rgb

	mini = Math.min(r, g, b);
	maxi = Math.max(r, g, b);
	v = maxi;

	delta = maxi - mini;

	if (maxi != 0) {
		s = delta / maxi;
	} else {
		s = 0;
		h = -1;
		return {hue: h, saturation: s, value: v};
	}

	if (delta == 0) {
		h = 0;
		s = 0;
		return {hue: h, saturation: s, value: v};
	}

	if (r == maxi) {
		h = (g - b) / delta;      // between yellow & magenta
	} else if (g == maxi) {
		h = 2 + (b - r) / delta;  // between cyan & yellow
	} else {
		h = 4 + (r - g) / delta;  // between magenta & cyan
	}

	h *= 60;  // degrees

	if (h < 0) {
		h += 360;
	}

	// convert h from [0, 360] to [0, 1]
	h = h / 360.0;

	return {hue: h, saturation: s, value: v};
}

function HSVtoRGB(hsv) {
	let r, g, b, i, f, p, q, t;
	let [h, s, v] = [hsv.hue, hsv.saturation, hsv.value];

	// convert h from [0, 1] to [0, 360]
	h = h * 360.0;

	if (s == 0) {
		// achromatic (grey)
		r = g = b = v;
		return [r, g, b];
	}

	h /= 60.0; // sector 0 to 5
	i = Math.floor(h);
	f = h - i; // factorial part of h
	p = v * (1 - s);
	q = v * (1 - s * f);
	t = v * (1 - s * (1 - f));

	switch(i) {
		case 0:
			r = v;
			g = t;
			b = p;
			break;
		case 1:
			r = q;
			g = v;
			b = p;
			break;
		case 2:
			r = p;
			g = v;
			b = t;
			break;
		case 3:
			r = p;
			g = q;
			b = v;
			break;
		case 4:
			r = t;
			g = p;
			b = v;
			break;
		default:    // case 5:
			r = v;
			g = p;
			b = q;
			break;
	}

	return [r, g, b];
}