# START HERE: How to Use DATA

*Source: DhakhaR's guide (DhakhaR's Forge World Discord, #valheim-how-to-and-help).*

## What is DATA?

Data has all the benefits of field editing (`f=`) and more — by storing edits as data, they're saved so they can be easily reapplied. It's almost like blueprinting your field edits. This means editing some yaml files, but it's mostly copy-paste and changing some 0's to 1's.

**Yaml file locations:**
- Steam: `C:\Program Files (x86)\Steam\steamapps\common\Valheim\BepInEx\config`
- Thunderstore: `C:\Users\YOURUSERNAME\AppData\Roaming\Thunderstore Mod Manager\DataFolder\Valheim\profiles\Valheim Mods\BepInEx\config`

These can be opened/edited with Notepad, or a dedicated yaml editor for more features — DhakhaR uses [Atom](https://atom-editor.cc/).

- `BepInEx\config\infinity_tools.yaml` — the existing tools; add custom tools here (hammer and hoe sections exist, but it doesn't affect function, only how you select the tool in-game).
- `BepInEx\config\data\data.yaml` — data entries for tools or data applied to pieces in-game. If you don't see a `data.yaml`, don't panic: open the game, hover over any object, and use `data save=test1` — this generates the file in the right place with your test1 data.

Yamls can be edited **live** — make a change and save with the game running, and see the effect instantly, no relaunch required.

## Formatting Care

Yamls are sensitive and must be formatted carefully — they don't tolerate poor punctuation, misplaced spaces, or incorrect indentation. If your yaml isn't working, it's most likely a tiny error you'll only spot with a bit of experience. Be careful with formatting!

Use [YAMLlint](https://www.yamllint.com/) to paste in your code and check for errors.

## Example: Changing a Creature's Name (f= vs. data)

**Field method:**
```
spawn_object Greydwarf f=Humanoid,name,Greg
```

**Data method:**
```
spawn_object Greydwarf data=greyGreg
```
```yaml
# in data.yaml
- name: greyGreg
  strings:
    - Humanoid.m_name, Greg
```

## Combining Multiple Edits: A Reusable NPC Template

This is where data really saves time. Example: a data block containing all fields needed to make a static, friendly, invincible NPC:

```yaml
- name: NPCstatic
  ints:
    - tamed, 1
    - MonsterAI.m_aggravatable, 0
  floats:
    - Humanoid.m_jumpForce, 0
    - MonsterAI.m_jumpInterval, 1E+30
    - max_health, 1000000000000000000000000000000
    - Humanoid.m_speed, 0
    - Humanoid.m_runTurnSpeed, 0
    - health, 1000000000000000000000000000001
    - Humanoid.m_walkSpeed, 0
    - Humanoid.m_turnSpeed, 0
    - Humanoid.m_acceleration, 0
    - Humanoid.m_crouchSpeed, 0
    - Humanoid.m_runSpeed, 0
  strings:
    - Humanoid.m_name, <name>
```

Apply it to any creature with:
```
spawn_object Skeleton data=NPCstatic
```

Notice the bottom line — `Humanoid.m_name, <name>`. Parameters in pointy brackets can be used for the parts you want to change per-spawn — here, all NPCs should be static, but their names should differ:
```
spawn_object Skeleton data=NPCstatic par=name,Terrance
```

## Further Resources

- Valheim World Editing Discord — help and advice: https://discord.gg/2FYtfrgWXK
- JP Valheim's video guide, "How to Analyze Gameobject Data in Valheim using WEC": https://www.youtube.com/watch?v=IeN__sAErlU
