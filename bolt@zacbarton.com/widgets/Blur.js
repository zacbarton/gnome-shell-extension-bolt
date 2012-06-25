const St = imports.gi.St;
const Lang = imports.lang;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const Clutter = imports.gi.Clutter;
const WorkspaceThumbnail = imports.ui.workspaceThumbnail;

const Blur = new Lang.Class({
	Name: "Blur",

	_init: function(bolt) {
		this.bolt = bolt;
		this.enabled = false;
		this.restackedConnection = 0;
		this.switchWorkspaceConnection = 0;

		this.blurEffect = new Clutter.BlurEffect();

		this.actor = new St.BoxLayout({style_class: "blur"
			, vertical: true
			, visible: true
			, reactive: false
			, clip_to_allocation: true
		});
		this.actor.add_effect_with_name("blur", this.blurEffect);

		// creating the thumbnail straight away sometimes results in no windows
		// so we add a delay here which seems to make everything work as expected
		let initTimeout = Mainloop.timeout_add(1500, Lang.bind(this, function() {
			// TODO look at using clutter clone for the entire workspace rather than building a thumbnail
			this.setForWorkspace();

			this.restackedConnection = global.screen.connect("restacked", Lang.bind(this, this.restackThumbnail));
			this.switchWorkspaceConnection = global.window_manager.connect("switch-workspace", Lang.bind(this, this.setForWorkspace));

			Mainloop.source_remove(initTimeout);
		}));
	},

	setThumbnail: function() {
		if (this.thumbnail) {
			this.thumbnail.destroy();
		}

		// http://blogs.gnome.org/alexl/2011/03/22/multimonitor-support-in-gnome-shell/ -> "The thumbnails only show the primary monitor."
		// as the above youll notice that the thumbnail blur on setups with the primary monitor on the right or bottom doesnt show
		// the running windows. try via the overview and youll see you cant see your monitor on the left or top and as bolt is re-using 
		// the same object it suffers this limitation also :-(
		let workspace = global.screen.get_active_workspace();
		this.thumbnail = new WorkspaceThumbnail.WorkspaceThumbnail(workspace);

		this.actor.add(this.thumbnail.actor);
	},

	setPorthole: function() {
		if (this.thumbnail) {
			if (this.bolt.isPopup) {
				let arrowRise = 0;
				let borderWidth = 0;
				let paddingLeft = 0;
				let paddingTop = 0;
				let boxPointerThemeNode = this.bolt.boxPointer.actor.peek_theme_node();

				if (boxPointerThemeNode) {
					arrowRise = boxPointerThemeNode.get_length("-arrow-rise");
					borderWidth = boxPointerThemeNode.get_length("-arrow-border-width");
					paddingLeft = boxPointerThemeNode.get_padding(St.Side.LEFT);
					paddingTop = boxPointerThemeNode.get_padding(St.Side.TOP);
				}

				this.thumbnail.setPorthole(this.bolt.boxPointer.actor.x + borderWidth + paddingLeft, this.bolt.boxPointer.actor.y + borderWidth + arrowRise + paddingTop, this.actor.width, this.actor.height);
			} else {
				this.thumbnail.setPorthole(0, Main.layoutManager.panelBox.height, this.actor.width, this.actor.height);
			}
		}
	},

	restackThumbnail: function() {
		let stack = global.get_window_actors();
		let stackIndices = {};

		for (let i = 0; i < stack.length; i++) {
			stackIndices[stack[i].get_meta_window().get_stable_sequence()] = i;
		}

		this.thumbnail.syncStacking(stackIndices);
	},

	setForWorkspace: function() {
		this.setThumbnail();
		this.setPorthole();
	},

	enable: function(enabled) {
		this.enabled = enabled;
		this.actor.visible = this.enabled;
	},

	destroy: function() {
		if (this.restackedConnection) {
			global.screen.disconnect(this.restackedConnection);
		}

		if (this.switchWorkspaceConnection) {
			global.window_manager.disconnect(this.switchWorkspaceConnection);
		}

		if (this.thumbnail) {
			this.thumbnail.destroy();
		}

		this.blurEffect = null;

		this.actor.destroy();
	}
});