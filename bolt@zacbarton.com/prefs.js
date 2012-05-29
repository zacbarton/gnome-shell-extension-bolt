const Lang = imports.lang;
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;

let thumbnail_factory = false;
try {
	const GnomeDesktop = imports.gi.GnomeDesktop;

	// in Ubuntu package are named gir1.2-gnomedesktop-3.0
	thumbnail_factory = new GnomeDesktop.DesktopThumbnailFactory();
} catch(e) {}

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Settings = Extension.imports.libs.Settings;

// FIXME complete overhaul
// TODO
// activities - change text, use icon, use distro icon, icon + text, none
// icons - sizing, spacing

function init() {
   
}

function buildPrefsWidget() {
	this.settings = Settings.getSettings(Extension);

	let frame = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL,
		border_width: 10
		, expand: true
	});
	frame.set_spacing(6);


	let general = new Gtk.Label({label: "<b>General</b>", use_markup: true, xalign: 0});
		let vbox3 = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, margin_left: 20});
			let label31= new Gtk.CheckButton({label: "Show instantly"});
			label31.set_active(this.settings.get_double(Settings.SHOW_ANIMATION_TIME) === 0);
			label31.connect("toggled", Lang.bind(this, function(check){
				this.settings.set_double(Settings.SHOW_ANIMATION_TIME, check.get_active() ? 0 : .175);
			}));
			let label32 = new Gtk.CheckButton({label: "Show home tab when opened"});
			label32.set_active(this.settings.get_boolean(Settings.ALWAYS_OPEN_TO_HOME));
			label32.connect("toggled", Lang.bind(this, function(check){
				this.settings.set_boolean(Settings.ALWAYS_OPEN_TO_HOME, check.get_active());
			}));
			let label11 = new Gtk.CheckButton({label: "Blur overlapping windows"});
			label11.set_active(this.settings.get_boolean(Settings.BLUR_BACKGROUND));
			label11.connect("toggled", Lang.bind(this, function(check){
					this.settings.set_boolean(Settings.BLUR_BACKGROUND, check.get_active());
			}));

	let tabs = new Gtk.Label({label: "<b>Tabs</b>", use_markup: true, xalign: 0});
		let vbox6 = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, margin_left: 20});
			let label33 = new Gtk.CheckButton({label: "Applications"});
			label33.set_active(this.settings.get_boolean(Settings.SHOW_APPLICATIONS));
			label33.connect("toggled", Lang.bind(this, function(check){
				this.settings.set_boolean(Settings.SHOW_APPLICATIONS, check.get_active());
			}));
			let label34 = new Gtk.CheckButton({label: "Files"});
			label34.set_active(this.settings.get_boolean(Settings.SHOW_FILES));
			label34.connect("toggled", Lang.bind(this, function(check){
				this.settings.set_boolean(Settings.SHOW_FILES, check.get_active());
			}));
			let label35 = new Gtk.CheckButton({label: "Contacts"});
			label35.set_active(this.settings.get_boolean(Settings.SHOW_CONTACTS));
			label35.connect("toggled", Lang.bind(this, function(check){
				this.settings.set_boolean(Settings.SHOW_CONTACTS, check.get_active());
			}));
			let label36 = new Gtk.CheckButton({label: "System"});
			label36.set_active(this.settings.get_boolean(Settings.SHOW_SYSTEM));
			label36.connect("toggled", Lang.bind(this, function(check){
				this.settings.set_boolean(Settings.SHOW_SYSTEM, check.get_active());
			}));
			let hbox31 = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, margin_top: 0, margin_left: 0});
				let label30 = new Gtk.Button({label: "Edit application & system categories"});
				label30.connect("clicked", function(button){
				  GLib.spawn_command_line_sync("alacarte");
				});

	let home = new Gtk.Label({label: "<b>Home tab</b>", use_markup: true, xalign: 0});
		let vbox4 = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, margin_left: 20});
			let label421 =  new Gtk.RadioButton({label: "Show recent applications"});
			label421.set_active(this.settings.get_string(Settings.HOME_APPLICATIONS_TYPE) === "recent");
			label421.connect("toggled", Lang.bind(this, function(check){
					this.settings.set_string(Settings.HOME_APPLICATIONS_TYPE, "recent");
			}));
			let label422 =  new Gtk.RadioButton({label: "Show popular applications", group: label421});
			label422.set_active(this.settings.get_string(Settings.HOME_APPLICATIONS_TYPE) === "popular");
			label422.connect("toggled", Lang.bind(this, function(check){
					this.settings.set_string(Settings.HOME_APPLICATIONS_TYPE, "popular");
			}));
			let label423 =  new Gtk.RadioButton({label: "Show favorite applications", group: label421});
			label423.set_active(this.settings.get_string(Settings.HOME_APPLICATIONS_TYPE) === "favorite");
			label423.connect("toggled", Lang.bind(this, function(check){
					this.settings.set_string(Settings.HOME_APPLICATIONS_TYPE, "favorite");
			}));
			let label43= new Gtk.CheckButton({label: "Show recent files"});
			label43.set_active(this.settings.get_boolean(Settings.HOME_SHOW_RECENT_FILES));
			label43.connect("toggled", Lang.bind(this, function(check){
				this.settings.set_boolean(Settings.HOME_SHOW_RECENT_FILES, check.get_active());
			}));
			let label44= new Gtk.CheckButton({label: "Show downloads"});
			label44.set_active(this.settings.get_boolean(Settings.HOME_SHOW_DOWNLOADS));
			label44.connect("toggled", Lang.bind(this, function(check){
				this.settings.set_boolean(Settings.HOME_SHOW_DOWNLOADS, check.get_active());
			}));

	 let search = new Gtk.Label({label: "<b>Search</b>", use_markup: true, xalign: 0});
		let vbox5 = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, margin_left: 20});
			let label53 = new Gtk.CheckButton({label: "Files and folders"});
			label53.set_active(this.settings.get_boolean(Settings.SEARCH_FILES_AND_FOLDERS));
			label53.connect("toggled", Lang.bind(this, function(check){
				this.settings.set_boolean(Settings.SEARCH_FILES_AND_FOLDERS, check.get_active());
			}));
			let label54 = new Gtk.CheckButton({label: "Contacts"});
			label54.set_active(this.settings.get_boolean(Settings.SEARCH_CONTACTS));
			label54.connect("toggled", Lang.bind(this, function(check){
				this.settings.set_boolean(Settings.SEARCH_CONTACTS, check.get_active());
			}));

	let theme = new Gtk.Label({label: "<b>Default Theme</b>", use_markup: true, xalign: 0});
		let vbox1 = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, margin_left: 20});
			let label12 =  new Gtk.RadioButton({label: "Match wallpaper color"});
			label12.set_active(this.settings.get_boolean(Settings.MATCH_WALLPAPER));
			label12.connect("toggled", Lang.bind(this, function(check){
				this.settings.set_boolean(Settings.MATCH_WALLPAPER, check.get_active());
			}));

			let hbox11 = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, margin_top: 0, margin_left: 0});
				let custom11 =  new Gtk.RadioButton({label: "Custom color", group: label12});
				custom11.set_active(!this.settings.get_boolean(Settings.MATCH_WALLPAPER));
				custom11.connect("toggled", function(button) {
					picker11.set_sensitive(button.get_active());
				});

				let picker11 = new Gtk.ColorButton({margin_left: 10});
					picker11.set_sensitive(custom11.get_active());
					picker11.set_use_alpha(true);

					let c = new Gdk.RGBA();
					c.parse(this.settings.get_string(Settings.CUSTOM_BACKGROUND_COLOR));   
					picker11.set_rgba(c);

					picker11.connect("color-set", Lang.bind(this, function(color){
						let c = color.get_rgba();
						let s = "rgba(" + c.red * 255 + ", " + c.green * 255 + ", " + c.blue * 255 + ", " + c.alpha + ")";
						this.settings.set_string(Settings.CUSTOM_BACKGROUND_COLOR, s);
					}));

	let sizing = new Gtk.Label({label: "<b>Sizing</b>", use_markup: true, xalign: 0});
		let vbox2 = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, margin_left: 20});
			let label21 =  new Gtk.RadioButton({label: "Automattic"});
			label21.set_active(this.settings.get_boolean(Settings.AUTOMATTIC_SIZING));
			label21.connect("toggled", Lang.bind(this, function(check){
					this.settings.set_boolean(Settings.AUTOMATTIC_SIZING, check.get_active());
			}));
			let hbox21 = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, margin_top: 0, margin_left: 0});
				let custom21 =  new Gtk.RadioButton({label: "Custom", group: label21});
				custom21.set_active(!this.settings.get_boolean(Settings.AUTOMATTIC_SIZING));
				custom21.connect("toggled", function(button) {
					spin21.set_sensitive(button.get_active());
					x21.set_sensitive(button.get_active());
					spin22.set_sensitive(button.get_active());
				});
				let s21value = this.settings.get_string(Settings.CUSTOM_SIZE).split("x");
				let spin21 = new Gtk.SpinButton({margin_left: 19});
					spin21.set_sensitive(custom21.get_active());
					spin21.set_range(3, 99);
					spin21.set_value(s21value[0]);
					spin21.set_increments(1, 5); // 5 = page up/down increment
					spin21.connect("value-changed", Lang.bind(this, function(button){
						let s = button.get_value_as_int() + "x" + spin22.get_value_as_int();
						this.settings.set_string(Settings.CUSTOM_SIZE, s);
					}));
				let x21 = new Gtk.Label({label: "x", margin_left: 5, margin_right: 5});
					x21.set_sensitive(false);
				let spin22 = new Gtk.SpinButton();
					spin22.set_sensitive(custom21.get_active());
					spin22.set_range(1, 99);
					spin22.set_value(s21value[1]);
					spin22.set_increments(1, 5); // 5 = page up/down increment
					spin22.connect("value-changed", Lang.bind(this, function(button){
						let s = spin21.get_value_as_int() + "x" + button.get_value_as_int();
						this.settings.set_string(Settings.CUSTOM_SIZE, s);
					}));

	if (!thumbnail_factory) {
		let infoBar = new Gtk.InfoBar({margin_bottom: 10});
			let thumbnailNotice = new Gtk.Label({label: "To see previews of some files install <b>gir1.2-gnomedesktop-3.0</b> and relogin.", use_markup: true, xalign: 0});

		frame.add(infoBar);
			infoBar.get_content_area().add(thumbnailNotice);
	}

	frame.add(general);
		frame.add(vbox3);
			vbox3.add(label31);
			vbox3.add(label32);
			vbox3.add(label11);

	frame.add(tabs);
		frame.add(vbox6);
			vbox6.add(label33);
			vbox6.add(label34);
			vbox6.add(label35);
			vbox6.add(label36);
			vbox6.add(hbox31);
				hbox31.add(label30);

	frame.add(home);
		frame.add(vbox4);
			vbox4.add(label421);
			vbox4.add(label422);
			vbox4.add(label423);
			vbox4.add(label43);
			vbox4.add(label44);

	frame.add(search);
		frame.add(vbox5);
			vbox5.add(label53);
			vbox5.add(label54);

	frame.add(theme);
		frame.add(vbox1);
			vbox1.add(label12);
			vbox1.add(hbox11);
				hbox11.add(custom11);
				hbox11.add(picker11);

	frame.add(sizing);
		frame.add(vbox2);
			vbox2.add(label21);
			vbox2.add(hbox21);
				hbox21.add(custom21);
				hbox21.add(spin21);
				hbox21.add(x21);
				hbox21.add(spin22);

	let donate = new Gtk.Label({label: "<a href='https://flattr.com/thing/668930'>Donate to this project</a>", use_markup: true, xalign: 0, margin_top: 20});
	frame.add(donate);

	frame.show_all();
	return frame;
}