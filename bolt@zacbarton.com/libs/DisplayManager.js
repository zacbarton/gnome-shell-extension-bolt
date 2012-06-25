const Lang = imports.lang;
const Main = imports.ui.main;
const Shell = imports.gi.Shell;
const Clutter = imports.gi.Clutter;
const Tweener = imports.ui.tweener;

const DisplayManager = new Lang.Class({
	Name: "DisplayManager",

	_init: function(bolt) {
		this.bolt = bolt;
		this.lastKeyFocus = 0;
		this.showAnimationTime = 0; // managed by settingsManager
		this.alwaysOpenToHomeView = true; // managed by settingsManager
		this.capturedEventConnection = 0;
	},

	show: function() {
		if (this.bolt.actor.visible) {
			return;
		}

		this.bolt.keyboardManager.captureKeys(true);

		Main.overview.emit("bolt-showing", this.showAnimationTime);
		this.beforeShow();

		this.bolt.coverPane.show();
		this.createOutsideClickHandler();

		if (this.alwaysOpenToHomeView || !this.bolt.activeTab.visible) {
			this.bolt.selectTab(this.bolt.homeView.tab);
		}

		if (this.showAnimationTime === 0) {
			this.bolt.actor.show();
			this.afterShow();
			Main.overview.emit("bolt-shown");
		} else {
			Tweener.removeTweens(this.bolt.actor);

			this.bolt.actor.opacity = 0;
			this.bolt.actor.show();
			Tweener.addTween(this.bolt.actor, {time: this.showAnimationTime
				, opacity: 255
				, transition: "easeOutQuad"
				, onComplete: Lang.bind(this, function() {
					this.afterShow();
					Main.overview.emit("bolt-shown");
				})
			});
		}
	},

	hide: function() {
		if (!this.bolt.actor.visible) {
			return;
		}

		this.bolt.keyboardManager.captureKeys(false);

		Main.overview.emit("bolt-hiding", this.showAnimationTime);
		this.beforeHide();

		this.bolt.coverPane.hide();
		this.destroyOutsideClickHandler();

		if (this.showAnimationTime === 0) {
			this.bolt.actor.hide();
			this.afterHide();
			Main.overview.emit("bolt-hidden");
		} else {
			Tweener.removeTweens(this.bolt.actor);

			Tweener.addTween(this.bolt.actor, {time: this.showAnimationTime
				, opacity: 0
				, transition: "easeOutQuad"
				, onComplete: Lang.bind(this, function() {
					this.bolt.actor.hide();
					this.bolt.actor.opacity = 255;
					this.afterHide();
					Main.overview.emit("bolt-hidden");
				})
			});
		}
	},

	createOutsideClickHandler: function() {
		this.capturedEventConnection = global.stage.connect("captured-event", Lang.bind(this, function(actor, event) {
			if (event.type() == Clutter.EventType.BUTTON_RELEASE) {
				let sourceActor = event.get_source();

				if (sourceActor === this.bolt.coverPane || Main.panel.actor.contains(sourceActor)) {
					this.hide();
					return true;
				}
			}

			return false;
		}));
	},

	destroyOutsideClickHandler: function() {
		if (this.capturedEventConnection) {
			global.stage.disconnect(this.capturedEventConnection);
			this.capturedEventConnection = 0;
		}
	},

	beforeShow: function() {
		// remember which item had focus
		this.lastKeyFocus = global.stage.get_key_focus();

		// mostly copied from Main::pushModal but without "global.stage.set_key_focus(actor);" as it slows down showing considerably
		let actor = this.bolt.actor;
		let timestamp = global.get_current_time();

		if (Main.modalCount == 0) {
			if (!global.begin_modal(timestamp, 0)) {
				global.log("pushModal: invocation of begin_modal failed");
			}
		}

		global.set_stage_input_mode(Shell.StageInputMode.FULLSCREEN);

		Main.modalCount += 1;

		let actorDestroyId = actor.connect("destroy", function() {
			let index = Main._findModal(actor);
			if (index >= 0)
				Main.modalActorFocusStack.splice(index, 1);
		});

		let curFocus = global.stage.get_key_focus();
		let curFocusDestroyId;

		if (curFocus != null) {
			curFocusDestroyId = curFocus.connect("destroy", function() {
				let index = Main._findModal(actor);
				if (index >= 0)
					Main.modalActorFocusStack[index].actor = null;
			});
		}

		Main.modalActorFocusStack.push({actor: actor
			, focus: curFocus
			, destroyId: actorDestroyId
			, focusDestroyId: curFocusDestroyId
		});

		// hide the active application icon
		Main.panel._appMenu.actor.hide();
	},

	afterShow: function() {
		if (this.bolt.isPopup === true) {
			this.bolt.boxPointer.setPosition(Main.panel._activitiesButton.actor, 0);

			this.bolt.boxPointer.actor.x = this.bolt.boxPointer._xPosition;
			this.bolt.boxPointer.actor.y = this.bolt.boxPointer._yPosition;

			let boxPointerThemeNode = this.bolt.boxPointer.actor.peek_theme_node();

			if (boxPointerThemeNode) {
				let arrowRise = boxPointerThemeNode.get_length("-arrow-rise");
				let borderWidth = boxPointerThemeNode.get_length("-arrow-border-width");

				this.bolt.blur.actor.x = borderWidth;
				this.bolt.blur.actor.y = arrowRise + borderWidth;
			}
		} else {
			this.bolt.boxPointer.actor.x = Main.layoutManager.panelBox.x;
			this.bolt.boxPointer.actor.y = Main.layoutManager.panelBox.y + Main.layoutManager.panelBox.height;

			this.bolt.blur.actor.x = 0;
			this.bolt.blur.actor.y = 0;
		}

		if (this.bolt.blur.enabled) {
			this.bolt.blur.setPorthole();
		}
	},

	beforeHide: function() {
		Main.popModal(this.bolt.actor);

		global.stage.set_key_focus(null);
	},

	afterHide: function() {
		this.bolt.searchView.clearText(true);
		this.bolt.searchView.stopSearch();

		//  restore focus
		if (this.lastKeyFocus) {
			global.stage.set_key_focus(this.lastKeyFocus);
			this.lastKeyFocus = 0;
		}

		// re-show the active application icon
		Main.panel._appMenu.actor.show();
	}
});