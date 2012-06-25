const St = imports.gi.St;
const Lang = imports.lang;
const Cairo = imports.cairo;
const Clutter = imports.gi.Clutter;
const BoxPointer2 = imports.ui.boxpointer;

const BoxPointer = new Lang.Class({
	Name: "BoxPointer",
	Extends: BoxPointer2.BoxPointer,

	_init: function(bolt) {
		this.bolt = bolt;
		this.parent(St.Side.TOP, {x_fill: true, y_fill: true, x_align: St.Align.START});
	},

	_shiftActor: function() {
		// we handle positioning within bolt
		return;
	},

	_muteInput: function() {
		// we handle events within bolt
		return;
	},

	_unmuteInput: function() {
		// we handle events within bolt
		return;
	},

	_drawBorder: function(area) {
		if (!this.bolt.isPopup) {
			return;
		}

		let themeNode = this.actor.get_theme_node();

		let borderWidth = themeNode.get_length('-arrow-border-width');
		let base = themeNode.get_length('-arrow-base');
		let rise = themeNode.get_length('-arrow-rise');
		let borderRadius = themeNode.get_length('-arrow-border-radius');

		let halfBorder = borderWidth / 2;
		let halfBase = Math.floor(base/2);

		let borderColor = themeNode.get_color('-arrow-border-color');
		let backgroundColor = themeNode.get_color('-arrow-background-color');

		let [width, height] = area.get_surface_size();
		let [boxWidth, boxHeight] = [width, height];
		if (this._arrowSide == St.Side.TOP || this._arrowSide == St.Side.BOTTOM) {
			boxHeight -= rise;
		} else {
			boxWidth -= rise;
		}
		let cr = area.get_context();
		Clutter.cairo_set_source_color(cr, borderColor);

		// Translate so that box goes from 0,0 to boxWidth,boxHeight,
		// with the arrow poking out of that
		if (this._arrowSide == St.Side.TOP) {
			cr.translate(0, rise);
		} else if (this._arrowSide == St.Side.LEFT) {
			cr.translate(rise, 0);
		}

		let [x1, y1] = [halfBorder, halfBorder];
		let [x2, y2] = [boxWidth - halfBorder, boxHeight - halfBorder];

		cr.moveTo(x1 + borderRadius, y1);
		if (this._arrowSide == St.Side.TOP) {
			if (this._arrowOrigin < (x1 + (borderRadius + halfBase))) {
				cr.lineTo(this._arrowOrigin, y1 - rise);
				cr.lineTo(Math.max(x1 + borderRadius, this._arrowOrigin) + halfBase, y1);
			} else if (this._arrowOrigin > (x2 - (borderRadius + halfBase))) {
				cr.lineTo(Math.min(x2 - borderRadius, this._arrowOrigin) - halfBase, y1);
				cr.lineTo(this._arrowOrigin, y1 - rise);
			} else {
				cr.lineTo(this._arrowOrigin - halfBase, y1);
				cr.lineTo(this._arrowOrigin, y1 - rise);
				cr.lineTo(this._arrowOrigin + halfBase, y1);
			}
		}

		cr.lineTo(x2 - borderRadius, y1);

		// top-right corner
		cr.arc(x2 - borderRadius, y1 + borderRadius, borderRadius,
			   3*Math.PI/2, Math.PI*2);

		if (this._arrowSide == St.Side.RIGHT) {
			if (this._arrowOrigin < (y1 + (borderRadius + halfBase))) {
				cr.lineTo(x2 + rise, this._arrowOrigin);
				cr.lineTo(x2, Math.max(y1 + borderRadius, this._arrowOrigin) + halfBase);
			} else if (this._arrowOrigin > (y2 - (borderRadius + halfBase))) {
				cr.lineTo(x2, Math.min(y2 - borderRadius, this._arrowOrigin) - halfBase);
				cr.lineTo(x2 + rise, this._arrowOrigin);
			} else {
				cr.lineTo(x2, this._arrowOrigin - halfBase);
				cr.lineTo(x2 + rise, this._arrowOrigin);
				cr.lineTo(x2, this._arrowOrigin + halfBase);
			}
		}

		cr.lineTo(x2, y2 - borderRadius);

		// bottom-right corner
		cr.arc(x2 - borderRadius, y2 - borderRadius, borderRadius,
			   0, Math.PI/2);

		if (this._arrowSide == St.Side.BOTTOM) {
			if (this._arrowOrigin < (x1 + (borderRadius + halfBase))) {
				cr.lineTo(Math.max(x1 + borderRadius, this._arrowOrigin) + halfBase, y2);
				cr.lineTo(this._arrowOrigin, y2 + rise);
			} else if (this._arrowOrigin > (x2 - (borderRadius + halfBase))) {
				cr.lineTo(this._arrowOrigin, y2 + rise);
				cr.lineTo(Math.min(x2 - borderRadius, this._arrowOrigin) - halfBase, y2);
			} else {
				cr.lineTo(this._arrowOrigin + halfBase, y2);
				cr.lineTo(this._arrowOrigin, y2 + rise);
				cr.lineTo(this._arrowOrigin - halfBase, y2);
			}
		}

		cr.lineTo(x1 + borderRadius, y2);

		// bottom-left corner
		cr.arc(x1 + borderRadius, y2 - borderRadius, borderRadius,
			   Math.PI/2, Math.PI);

		if (this._arrowSide == St.Side.LEFT) {
			if (this._arrowOrigin < (y1 + (borderRadius + halfBase))) {
				cr.lineTo(x1, Math.max(y1 + borderRadius, this._arrowOrigin) + halfBase);
				cr.lineTo(x1 - rise, this._arrowOrigin);
			} else if (this._arrowOrigin > (y2 - (borderRadius + halfBase))) {
				cr.lineTo(x1 - rise, this._arrowOrigin);
				cr.lineTo(x1, Math.min(y2 - borderRadius, this._arrowOrigin) - halfBase);
			} else {
				cr.lineTo(x1, this._arrowOrigin + halfBase);
				cr.lineTo(x1 - rise, this._arrowOrigin);
				cr.lineTo(x1, this._arrowOrigin - halfBase);
			}
		}

		cr.lineTo(x1, y1 + borderRadius);

		// top-left corner
		cr.arc(x1 + borderRadius, y1 + borderRadius, borderRadius,
			   Math.PI, 3*Math.PI/2);

		if (rise === 0 || this.bolt.themeManager.theme !== "bolt") {
			Clutter.cairo_set_source_color(cr, backgroundColor);
			cr.fillPreserve();
		} else {
			let savedPath = cr.copyPath();

			let contentBackgroundColor = new Clutter.Color();
			contentBackgroundColor.from_string(this.contentBackgroundColor);

			let tabsBackgroundColor = new Clutter.Color();
			tabsBackgroundColor.from_string(this.tabsBackgroundColor);

			Clutter.cairo_set_source_color(cr, contentBackgroundColor);
			cr.fillPreserve();
			Clutter.cairo_set_source_color(cr, tabsBackgroundColor);
			cr.fillPreserve();

			cr.newPath();
			cr.moveTo(x1, y1 + 1);
			cr.lineTo(x2, y1 + 1);
			cr.lineTo(x2, y2);
			cr.lineTo(x1, y2);
			cr.closePath();

			cr.setOperator(Cairo.Operator.CLEAR);
			cr.fillPreserve();
			cr.setOperator(Cairo.Operator.OVER);

			cr.newPath();
			cr.appendPath(savedPath);
		}

		Clutter.cairo_set_source_color(cr, borderColor);
		cr.setLineWidth(borderWidth);
		cr.stroke();
	},

	destroy: function() {
		this.actor.destroy();
	}
});