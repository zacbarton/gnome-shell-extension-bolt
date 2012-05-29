const Lang = imports.lang;
const Main = imports.ui.main;
const Shell = imports.gi.Shell;
const Clutter = imports.gi.Clutter;
const Tweener = imports.ui.tweener;

const Animator = new Lang.Class({
	Name: "Animator",

	_init: function(bolt) {
		this.bolt = bolt;
		this.lastKeyFocus = 0;
		this.showAnimationTime = 0; // managed by settingsManager
		this.alwaysOpenToHomeView = true; // managed by settingsManager
		this.capturedEventConnection = 0;
	},

	show: function() {
		if (this.bolt.container.visible) {
			return;
		}

		this.bolt.keyboardManager.captureKeys(true);

		this.beforeShow();

		this.bolt.coverPane.show();
		this.createOutsideClickHandler();

		if (this.alwaysOpenToHomeView || !this.bolt.activeTab.visible) {
			this.bolt.selectTab(this.bolt.homeView.tab);
		}

		if (this.showAnimationTime === 0) {
			if (this.bolt.blur.enabled) {
				this.bolt.blur.actor.show();
			}

			this.bolt.container.show();
		} else {
			if (this.bolt.blur.enabled) {
				Tweener.removeTweens(this.bolt.blur.actor);

				this.bolt.blur.actor.opacity = 0;
				this.bolt.blur.actor.show();
				Tweener.addTween(this.bolt.blur.actor, {time: this.showAnimationTime
					, opacity: 255
					, transition: "easeOutQuad"
				});
			}

			Tweener.removeTweens(this.bolt.container);

			this.bolt.container.opacity = 0;
			this.bolt.container.show();
			Tweener.addTween(this.bolt.container, {time: this.showAnimationTime
				, opacity: 255
				, transition: "easeOutQuad"
			});
		}
	},

	hide: function() {
		if (!this.bolt.container.visible) {
			return;
		}

		this.bolt.keyboardManager.captureKeys(false);

		this.beforeHide();

		this.bolt.coverPane.hide();
		this.destroyOutsideClickHandler();

		if (this.showAnimationTime === 0) {
			if (this.bolt.blur.enabled) {
				this.bolt.blur.actor.hide();
			}

			this.bolt.container.hide();
			this.afterHide();
		} else {
			if (this.bolt.blur.enabled) {
				Tweener.removeTweens(this.bolt.blur.actor);

				Tweener.addTween(this.bolt.blur.actor, {time: this.showAnimationTime
					, opacity: 0
					, transition: "easeOutQuad"
					, onComplete: Lang.bind(this, function() {
						this.bolt.blur.hide();
						this.bolt.blur.actor.opacity = 255;
					})
				});
			}

			Tweener.removeTweens(this.bolt.container);

			Tweener.addTween(this.bolt.container, {time: this.showAnimationTime
				, opacity: 0
				, transition: "easeOutQuad"
				, onComplete: Lang.bind(this, function() {
					this.bolt.container.hide();
					this.bolt.container.opacity = 255;
					this.afterHide();
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
		let actor = this.bolt.container;
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
	},

	beforeHide: function() {
		Main.popModal(this.bolt.container);

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
	}
});