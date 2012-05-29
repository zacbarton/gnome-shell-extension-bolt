const Lang = imports.lang;
const Mainloop = imports.mainloop;

function onFirstMap(actor, callback) {
	// supports multiple onFirstMap's
	if (!actor.mappedCounter) {
		actor.mappedCounter = 1;
	} else {
		actor.mappedCounter++;
	}

	let mappedId = "mappedId" + actor.mappedCounter;

	actor[mappedId] = actor.connect("notify::mapped", Lang.bind(this, function() {
		if (actor.visible && global.stage.contains(actor)) {
			actor.disconnect(actor[mappedId]);
			callback();
		}
	}));
}

function addExtraCssSupport(actor) {
	onFirstMap(actor, Lang.bind(this, function() {
		let themeNode = actor.get_theme_node();

		let top = themeNode.get_length("top");
		let left = themeNode.get_length("left");

		let width = themeNode.get_length("width");
		let height = themeNode.get_length("height");

		let marginTop = themeNode.get_length("margin-top");
		let marginRight = themeNode.get_length("margin-right");
		let marginBottom = themeNode.get_length("margin-bottom");
		let marginLeft = themeNode.get_length("margin-left");

		if (top > 0) {
			actor.set_y(top);
		}
		if (left > 0) {
			actor.set_x(left);
		}

		if (width > 0) {
			actor.set_width(width);
		}
		if (height > 0) {
			actor.set_height(height);
		}

		actor.set_margin_top(marginTop);
		actor.set_margin_right(marginRight);
		actor.set_margin_bottom(marginBottom);
		actor.set_margin_left(marginLeft);
	}));
}

function getNextSiblingVisible(actor) {
	let next = actor.get_next_sibling();
	while (next !== null) {
		if (!next.visible) {
			next = next.get_next_sibling();
		} else {
			break;
		}
	}
	return next;
}

function getPreviousSiblingVisible(actor) {
	let previous = actor.get_previous_sibling();
	while (previous !== null) {
		if (!previous.visible) {
			previous = previous.get_previous_sibling();
		} else {
			break;
		}
	}
	return previous;
}

function getFirstChildVisible(actor) {
	let children = actor.get_children();
	for (let i = 0; i < children.length; i++) {
		if (children[i].visible) {
			return children[i];
		}
	}
	return null;
}

function getLastChildVisible(actor) {
	let children = actor.get_children();
	for (let i = children.length - 1; i >= 0; i--) {
		if (children[i].visible) {
			return children[i];
		}
	}
	return null;
}

function unique(array, func) {
	var unique = [];
	var count = array.length;
	for (var i = 0; i < count; i++) {
		for (var j = i + 1; j < count; j++) {
			if ((func && array[i][func]() === array[j][func]()) || (array[i] === array[j])) {
				j = ++i;
			}
		}
		unique.push(array[i]);
	}
	return unique;
}

function camelCase(string) {
	return string.replace(/(\s[a-z])/gi, function($1) {
		return $1.toUpperCase().replace(" ", "");
	});
}