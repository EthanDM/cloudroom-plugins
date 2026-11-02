# Compact Navigation

Turns the sidebar's New thread, Plugins, Skills, Loops, and More rows into one
icon bar. It reuses Cloudroom’s native navigation inside the public
`experimental_sidebarNavigation` replacement slot. There are no runtime dependencies.

Native visibility/order preferences, actions, disabled/active states, modifier-click
splits, the More menu, context menus, and keyboard shortcuts remain in charge.
Tooltips show each action’s label (and shortcut when supplied) on hover or keyboard
focus. Labels stay in the accessibility tree. Touch devices get larger buttons;
extra visible destinations wrap rather than overflow a narrow sidebar.

Use **More → Customize sidebar** to show, hide, or reorder items. That editor stays
full-size. Direct icon reordering is disabled because the native navigation uses vertical
sorting geometry. Native drag-to-split, modifier-click, and context-menu split
commands still work. Per-panel hover options are available through the context menu.

The slot activates automatically with Cloudroom’s default Automatic preference.
If needed, select **Settings → Appearance → Sidebar → Navigation → Compact icon bar**.
Choosing Built-in or disabling/removing this plugin restores normal navigation.

v139’s runtime SDK 0.6.50 includes this replacement slot, but its published npm
SDK 0.6.49 omits the declarations. A small local type describes only the verified
slot fields used here; the engine requirement prevents installation on older SDKs.

The scoped styles and tooltip script target v139’s native navigation data hooks.
A markup change may require updating them. The script removes its tooltip attributes,
observer, and stylesheet on disposal. No thread-list or window-control styles change.

Install separately on each Cloudroom server:

```sh
room-cli plugin install git:https://github.com/EthanDM/cloudroom-plugins.git@main --plugin compact-navigation --yes
```

Update: `room-cli plugin update compact-navigation --yes`.
Remove: `room-cli plugin remove compact-navigation`.
