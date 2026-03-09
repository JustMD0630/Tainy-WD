[English](README.md) | [Hindi (India)](README_hi.md) | [Português (Brasil)](README_pt-BR.md) | [Tiếng Việt](README_VI.md) | **ภาษาไทย**

<br />
<p align="center">
  <a href="https://github.com/RainyXeon/Tainy">
    <img src="https://ucarecdn.com/de81547a-7fe1-47a8-b944-d332e7150c85/38a3efe60cde73928c8d3e9b680f8c92.webp" alt="tainy" width="200" height="200">
  </a>

  <h1 align="center">tainy</h1>

  <p align="center">ซอร์สโค้ดบอทเพลงคุณภาพที่มีระบบครบครันและทรงพลังสำหรับ Discord ที่จะนำพาโลกแห่งเสียงเพลงและดนตรีสู่เซิร์ฟเวอร์ Discord ของพวกคุณ!
    <br />
    <br />
    <a href="https://top.gg/bot/992776455790534667">เชิญบอทเพลง Dreamvast ♫</a>
    ·
    <a href="https://github.com/RainyXeon/Tainy/issues">รายงานปัญหา & ให้ข้อเสนอแนะหรือไอเดีย</a>
    ·
    <a href="https://discord.gg/xff4e2WvVy">เซิร์ฟเวอร์ Discord สำหรับการช่วยเหลือต่างๆ</a>
  </p>
</p>

## 💎 ฟีเจอร์ต่างๆ

- ใช้ภาษา Typescript เพื่อหลีกเลี่ยงข้อผิดพลาดระหว่างใช้ใน Production
- ระบบเล่นเพลงสุดเจ๋งพร้อมปุ่มควบคุม
- มีระบบห้องสั่งเพลงสุดเท่
- มีระบบ 24/7
- รองรับการเปลี่ยนภาษาได้หลากหลาย!
- เป็นคำสั่งแบบ Slash Commands
- ปรับแต่งฟิลเตอร์เพลงได้ตามใจชอบ
- มีระบบเล่นเพลงแบบเพลย์ลิสต์
- มีระบบสมาชิกพรีเมี่ยม (แบบทั้ง Guild / User)
- สามารถเล่นเพลงจากไฟล์เสียงได้
- มีระบบ คูลดาวน์ คำสั่ง
- มีระบบ Shard
- มีระบบเข้าสายเองแบบอัตโนมัติหลังรีสตาร์ทบอท
- มีระบบ หยุด/เล่น เพลงแบบอัตโนมัติ
- มีระบบ ค้นหาเพลงแบบสำเร็จรูปให้เลย
- ปรับปรุงอัพเดต Lavalink อัตโนมัติจากเว็ปไซต์ [lavalink.darrennathanael.com](https://lavalink.darrennathanael.com/NoSSL/lavalink-without-ssl)
- รองรับการเล่นเพลงผ่าน lavalink v4, v3 และก็ nodelink v2

## 🎶 รองรับเล่นเพลงผ่านลิ้งค์แอพพลิเคชั่นอะไรบ้าง?

|         รองรับลิ้งค์เพลง         | ไม่ต้องใช้ปลั๊กอินของ Lavalink | ต้องใช้ปลั๊กอิน Lavalink |
| :------------------------------: | :----------------------------: | :----------------------: |
|             YouTube              |               ✅               |            ✅            |
|            SoundCloud            |               ✅               |            ✅            |
|           (LS) Spotify           |               ⚠️               |            ✅            |
|               HTTP               |               ✅               |            ✅            |
|           (LS) Deezer            |               ⚠️               |            ✅            |
|              Twitch              |               ✅               |            ✅            |
|             Bandcamp             |               ✅               |            ✅            |
|            Nicovideo             |               ⚠️               |            ⚠️            |
|         (LS) Apple Music         |               ⚠️               |            ✅            |
|        (LS) Yandex Music         |               ❌               |            ✅            |
|         (LS) Flowery TTS         |               ❌               |            ✅            |
|          (DB) Mixcloud           |               ❌               |            ✅            |
|          (DB) OC ReMix           |               ❌               |            ✅            |
|           (DB) Clyp.it           |               ❌               |            ✅            |
|           (DB) Reddit            |               ❌               |            ✅            |
|           (DB) GetYarn           |               ❌               |            ✅            |
|       (DB) Text to Speech        |               ❌               |            ✅            |
|        (DB) TikTok (BETA)        |               ❌               |            ✅            |
| (DB) P\*\*nhub (Not recommended) |               ❌               |            ✅            |
|          (DB) Soundgasm          |               ❌               |            ✅            |

- ✅ **รองรับแบบเต็มพิกัดด้วยการตั้งค่าดั้งเดิมของ Lavalink อยู่แล้ว**
- ⚠️ **รองรับแต่ผลการค้นหาจะออกมาเป็นของ Youtube หรือ Soundcloud เท่านั้น**
- ❌ **ไม่รองรับจร้า:3**
- (LS) **ต้องใช้ปลั๊กอินของ LavaSrc**
- (DB) **ต้องใช้ปลั๊กอินของ DuncteBot**

## 📂 รองรับฐานข้อมูลอะไรบ้าง?

- [x] MySQL
- [x] MongoDB
- [x] JSON
- [x] PostgresSQL

## 🔉 รองรับการเล่นเพลงผ่าน Lavalink/Nodelink เวอร์ชั่นอะไรบ้าง?

| ประเภท   | รองรับเวอร์ชั่น | ชื่อไดร์เวอร์     |
| -------- | --------------- | ----------------- |
| Lavalink | v4.0.0 - v4.x.x | lavalink/v4/koinu |
| Lavalink | v3.0.0 - v3.7.x | lavalink/v3/koto  |
| Nodelink | v2.0.0 - v2.x.x | nodelink/v2/nari  |

## 🖼️ ตัวอย่างการภาพใช้งานต่างๆ

![help_command](https://ucarecdn.com/1843f71c-9a4f-4fd0-b72d-63c4ecc40a74/Screenshot_20240825_074957.jpg)
![song_req](https://ucarecdn.com/25e8fc92-842d-40c2-a653-d1c0224804ae/Picsart_240825_081626013.jpg)
![playlist_info](https://ucarecdn.com/1f759973-8cc8-49c5-babb-0e60c297ab2e/Screenshot_2024_0825_075240.jpg)
![player](https://ucarecdn.com/2ef47700-0d6c-4114-86c6-6c98544aa116/Picsart_240825_082538385.jpg)

## 📋 สิ่งที่คุณต้องเตรียมไว้ใช้ในการเปิดบอท

- ![Node.js](https://img.shields.io/badge/Node.js-026E00?style=for-the-badge) ใช้ Node.js เวอร์ชั่น 18.0.0+ ขึ้นไป [Download](https://nodejs.org/en/download)
- ![Discord](https://img.shields.io/badge/Discord-404EED?style=for-the-badge) Discord Bot Token [Guide](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot)
- ![Lavalink](https://img.shields.io/badge/Lavalink-FC3F37?style=for-the-badge) ใช้ Lavalink เวอร์ชั่น 3.7.0+ หรือ 4.0.0+ ขึ้นไป [Download](https://github.com/lavalink-devs/Lavalink/releases)
- ![Git](https://img.shields.io/badge/Git-F05033?style=for-the-badge) Git [Download](https://git-scm.com/downloads)

## 🛠️ วิธีการติดตั้งบอทเพลง

1. โคลนโปรเจกต์นี้โดยใช้คำสั่ง `git clone https://github.com/RainyXeon/Tainy.git`
2. ใช้คำสั่ง `cd Tainy` เพื่อเข้าไปในโฟลเดอร์ **tainy**
3. การตั้งค่า ไฟล์ Config:
   - จำไว้: ทุกประเภทไฟล์การตั้งค่าต่างๆจำเป็นจะต้องใส่พวก `TOKEN`, `OWNER_ID` แล้วก็ `NODES` ด้วยนะค้าบ
   - แต่ถ้าอยากใช้การตั้งค่าดั้งเดิมและไม่ต้องใส่การตั้งค่าเยอะแยะ ก็แค่เปลี่ยนชื่อไฟล์ของ **example.app.yml** เป็น **app.yml** นะจ๊ะ
   - แต่ถ้า! อยากจะตั้งค่าทุกอย่างแบบเต็มพิกัดละก็เปลี่ยนชื่อไฟล์ของ **example.full.app.yml** เป็น **app.yml** นะควัฟ
4. รันคำสั่ง `npm i` เพื่อติดตั้ง Package ที่บอทต้องใช้นะค้าบ
5. หลังติดตั้งเสร็จ รันคำสั่ง `npm run build:full` เพื่อ Build ไฟล์บอทออกมา
6. หลังจากนั้น รันคำสั่ง `npm start` เพื่อที่จะเริ่มใช้งานบอทได้เลย!
7. **เท่านี้ก็เรียบร้อย! ขอให้สนุกกับการฟังเพลงด้วยซอร์สโค้ดของ tainy นะค้าบ!**

## [![Repl.it](https://img.shields.io/badge/Repl.it-1C2333?style=for-the-badge&logo=replit&logoColor=orange)](https://replit.com/@RainyXeon/Tainy)

1. [กดที่ผมสิ!](https://replit.com/@RainyXeon/Tainy) และทำการ Fork โปรเจกต์ repl ให้เรียบร้อย
2. กรอกการตั้งค่าต่างๆใน **app.yml** และใส่พวก `TOKEN` และก็ `NODES` ด้วยนะ
3. และเริ่มบอทด้วยการกดปุ่ม **Run** ได้เลย!
4. **เท่านี้ก็เรียบร้อย! ขอให้สนุกกับการฟังเพลงด้วยซอร์สโค้ดของ tainy นะค้าบ!**

## ⚙️ คำแนะนำต่างๆ

สำหรับการตั้งค่าเพิ่มเติม และก็ คำแนะนำในการตั้งค่าต่างๆ สามารถดูได้ที่แท็บ **Wiki** ได้ หรือจะ [กดตรงนี้ได้เหมือนกัน!](https://github.com/RainyXeon/Tainy/wiki)

## 📜 นโยบายกำหนดเวอร์ชั่น

tainy ปฏิบัติตามนโยบายของ [Semantic Versioning](https://semver.org/)

หมายเลขเวอร์ชั่นประกอบด้วยส่วนต่างๆ ตามนี้:

    MAJOR การเปลี่ยนแปลงที่ไม่สามารถใช้งานร่วมกับรุ่นก่อนหน้าได้
    MINOR คุณสมบัติใหม่ที่สามารถใช้งานร่วมกับรุ่นก่อนหน้าได้
    PATCH การแก้ไขข้อผิดพลาดที่สามารถใช้งานร่วมกับรุ่นก่อนหน้าได้
    BUILD ข้อมูล Metadata เพิ่มเติมเกี่ยวกับ Build
    PRERELEASE เวอร์ชันทดสอบก่อนที่จะเผยแพร่อย่างเป็นทางการ

หมายเลขเวอร์ชั่นสามารถมีการผสมผสานที่ไม่เหมือนกันได้ ขึ้นอยู่กับประเภทการเผยแพร่ต่างๆ:

    `MAJOR.MINOR.PATCH` - ปล่อยออกมาอย่างเป็นทางการและมีความเสถียร
    `MAJOR.MINOR.PATCH+BUILD` - ปล่อยออกมาอย่างเป็นทางการและมีความเสถียรแต่มีข้อมูล Metadata เพิ่มเติมเกี่ยวกับ Build
    `MAJOR.MINOR.PATCH-PRERELEASE` - เวอร์ชันทดสอบก่อนที่จะเผยแพร่อย่างเป็นทางการ
    `MAJOR.MINOR.PATCH-PRERELEASE+BUILD` - เวอร์ชันทดสอบก่อนที่จะเผยแพร่อย่างเป็นทางการแต่มีข้อมูล Metadata เพิ่มเติมเกี่ยวกับ Build

## 📃 ทีมแปลภาษาให้บอท (ภาษาต่างๆ)

- [x] **en (ภาษาอังกฤษ)**
  - [@RainyXeon](https://github.com/RainyXeon) **Discord:** `rainyxeon`
- [x] **vi (ภาษาเวียดนาม)**
  - [@RainyXeon](https://github.com/RainyXeon) **Discord:** `rainyxeon`
- [x] **hi (ภาษาฮินดี)**
  - [@anas-ike](https://github.com/anas-ike) **Discord:** `lights.out.`
- [x] **ko (ภาษาเกาหลี)**
  - [@EmuPIKin](https://github.com/EmuPIKin) **Discord:** `emupikin`
- [x] **ru (ภาษารัสเซีย)**
  - [@AutoP1ayer](https://github.com/AutoP1ayer) **Discord:** `autoplayer.uwu`
- [x] **th (ภาษาไทยที่พ่อขุนรามกุมขมับ)**
  - [@SillyDark](https://github.com/SillyDark) **Discord:** `defectsocute`
- [x] **pt (ภาษาโปรตุเกส)**
  - [@psycodeliccircus](https://github.com/psycodeliccircus) **Discord:** `renildomrc`

## เอ๊ะ⁉ ช้าก่อน อยากจะมาร่วมเป็นคนแปลภาษาให้บอทด้วยงั้นรึ มาสิมาเลย!?

- [Crowdin](https://crowdin.com/project/tainy)

## 💫 ขอขอบคุณผู้ร่วมงานสุดแสนวิเศษ

- [@DarrenOfficial](https://github.com/DarrenOfficial) [Lavalink Sources]
- [@PAINFUEG0](https://github.com/PAINFUEG0) [เพื่อนเราเอง!]
- [@Adivise](https://github.com/Adivise) [แรงบันดาลใจ]
- [@brblacky](https://github.com/brblacky) [แรงบันดาลใจ]
- [@mrstebo](https://github.com/mrstebo) [env Praser]
- [@ItzZoldy](https://github.com/ItzZoldy) [คนออกแบบ]

**อย่างสุดท้าย ขอขอบคุณทุกๆคนที่กด Starred ให้โปรเจกต์นี้และรวมถึงคนที่มีส่วนรวมทำให้โปรเจกต์ออกมาดีด้วยนะ 💖**

## 💫 เครดิต:

- [@RainyXeon](https://github.com/RainyXeon) **Discord:** `rainyxeon` ในฐานะเจ้าของและคนสร้างโปรเจกต์อันนี้!
