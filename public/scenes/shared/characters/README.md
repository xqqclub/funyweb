# Character Asset Guide

這個資料夾用來存放多人模式的角色素材。

## 目前使用規則

- `characters/` 根層：主管理者目前正在使用的角色素材
- `characters/male/`、`characters/female/`：多人玩家角色素材

也就是說，現階段主管理者與玩家素材先分開管理：

```txt
public/scenes/shared/characters/
  main-working.png
  main-cleaning.png
  at-home-gaming.png
  ...
  male/
  female/
```

之後若要把主管理者也改成角色庫制，再另外整併即可。

## 建議結構

```txt
public/scenes/shared/characters/
  male/
    d-exhor/
    drovik/
  female/
    lyra/
    niva/
```

## 命名規則

每個角色資料夾內請盡量維持固定檔名：

```txt
working.png
going-home-1.png
going-home-2.png
going-home-3.png
biking.png
cleaning.png
sleeping.png
at-home-idle.png
at-home-gaming.png
at-home-streaming.png
at-home-reading.png
```

## 範例

```txt
public/scenes/shared/characters/male/d-exhor/working.png
public/scenes/shared/characters/male/d-exhor/going-home-1.png
public/scenes/shared/characters/female/lyra/sleeping.png
public/scenes/shared/characters/female/lyra/at-home-reading.png
```

## 建議

- 角色資料夾名稱請使用英文小寫與 `-`
- 不建議使用中文作為正式路徑
- 若某角色暫時還沒做齊全部狀態，可以先補常用狀態
