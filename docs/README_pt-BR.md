[English](README.md) | [Hindi (India)](README_hi.md) | **Português (Brasil)** | [Tiếng Việt](README_VI.md) | [ภาษาไทย](README_TH.md)

<br />
<p align="center">
  <a href="https://github.com/RainyXeon/Tainy">
    <img src="https://ucarecdn.com/de81547a-7fe1-47a8-b944-d332e7150c85/38a3efe60cde73928c8d3e9b680f8c92.webp" alt="tainy" width="200" height="200">
  </a>

  <h1 align="center">tainy</h1>

  <p align="center">Um bot de música versátil e poderoso para o Discord que traz ritmo e melodia para o seu servidor!
    <br />
    <br />
    <a href="https://top.gg/bot/992776455790534667">Convide Dreamvast ♫</a>
    ·
    <a href="https://github.com/RainyXeon/Tainy/issues">Reportar Problemas e Dar Sugestões</a>
    ·
    <a href="https://discord.gg/xff4e2WvVy">Servidor de Suporte</a>
  </p>
</p>

## 💎 Recursos

- Linguagem TypeScript para Evitar Erros em Produção
- Sistema de Música Avançado com Botões
- Canal de Solicitação de Músicas
- Modo 24/7
- Multi Linguagem
- Comandos Slash
- Filtros Personalizados
- Sistema de Playlist
- Sistema Premium
- Tocar Música Usando Arquivo
- Sistema de Tempo de Recarga
- Sistema de Shard
- Reconexão Automática
- Pausa/Retomada Automática
- Pesquisa Automática Completa
- Correção Automática do Lavalink de [lavalink.darrennathanael.com](https://lavalink.darrennathanael.com/NoSSL/lavalink-without-ssl)
- Suporte ao lavalink v4, v3 e nodelink v2

## 🎶 Fontes Suportadas

|         Fonte de Música          | Sem Plugin Lavalink | Com Plugin Lavalink |
| :------------------------------: | :-----------------: | :-----------------: |
|             YouTube              |         ✅          |         ✅          |
|            SoundCloud            |         ✅          |         ✅          |
|           (LS) Spotify           |         ⚠️          |         ✅          |
|               HTTP               |         ✅          |         ✅          |
|           (LS) Deezer            |         ⚠️          |         ✅          |
|              Twitch              |         ✅          |         ✅          |
|             Bandcamp             |         ✅          |         ✅          |
|            Nicovideo             |         ⚠️          |         ⚠️          |
|         (LS) Apple Music         |         ⚠️          |         ✅          |
|        (LS) Yandex Music         |         ❌          |         ✅          |
|         (LS) Flowery TTS         |         ❌          |         ✅          |
|          (DB) Mixcloud           |         ❌          |         ✅          |
|          (DB) OC ReMix           |         ❌          |         ✅          |
|           (DB) Clyp.it           |         ❌          |         ✅          |
|           (DB) Reddit            |         ❌          |         ✅          |
|           (DB) GetYarn           |         ❌          |         ✅          |
|       (DB) Text to Speech        |         ❌          |         ✅          |
|        (DB) TikTok (BETA)        |         ❌          |         ✅          |
| (DB) P\*\*nhub (Não recomendado) |         ❌          |         ✅          |
|          (DB) Soundgasm          |         ❌          |         ✅          |

- ✅ **Suporte completo com a configuração padrão do Lavalink**
- ⚠️ **Suporta mas resolve do YouTube ou SoundCloud apenas**
- ❌ **Não suportado**
- (LS) **Fonte do plugin LavaSrc**
- (DB) **Fonte do plugin DuncteBot**

## 📂 Bancos de Dados Suportados

- [x] MySQL
- [x] MongoDB
- [x] JSON
- [x] PostgresSQL

## 🔉 Versão Suportada do Lavalink/Nodelink

| Tipo     | Versões Suportadas | Nome do Driver    |
| -------- | ------------------ | ----------------- |
| Lavalink | v4.0.0 - v4.x.x    | lavalink/v4/koinu |
| Lavalink | v3.0.0 - v3.7.x    | lavalink/v3/koto  |
| Nodelink | v2.0.0 - v2.x.x    | nodelink/v2/nari  |

## 🖼️ Mostrar

![help_command](https://ucarecdn.com/1843f71c-9a4f-4fd0-b72d-63c4ecc40a74/Screenshot_20240825_074957.jpg)
![song_req](https://ucarecdn.com/25e8fc92-842d-40c2-a653-d1c0224804ae/Picsart_240825_081626013.jpg)
![playlist_info](https://ucarecdn.com/1f759973-8cc8-49c5-babb-0e60c297ab2e/Screenshot_2024_0825_075240.jpg)
![player](https://ucarecdn.com/2ef47700-0d6c-4114-86c6-6c98544aa116/Picsart_240825_082538385.jpg)

## 📋 Requisitos

- ![Node.js](https://img.shields.io/badge/Node.js-026E00?style=for-the-badge) Versão do Node.js 18.0.0+ [Download](https://nodejs.org/en/download)
- ![Discord](https://img.shields.io/badge/Discord-404EED?style=for-the-badge) Token de Bot do Discord [Guia](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot)
- ![Lavalink](https://img.shields.io/badge/Lavalink-FC3F37?style=for-the-badge) Versão do Lavalink 3.7.0+ ou 4.0.0+ [Download](https://github.com/lavalink-devs/Lavalink/releases)
- ![Git](https://img.shields.io/badge/Git-F05033?style=for-the-badge) Git [Download](https://git-scm.com/downloads)

## 🛠️ Instalação

1. Clone este repositório usando `git clone https://github.com/RainyXeon/Tainy.git`
2. execute `cd Tainy` para ir para a pasta **tainy**.
3. Arquivos de configuração:
   - Nota: Todos os tipos de configurações devem preencher `TOKEN`, `OWNER_ID` e `NODES`
   - Se você deseja usar a configuração padrão e ter uma configuração mínima, renomeie o arquivo **example.app.yml** para **app.yml**
   - Se você deseja usar todas as configurações, renomeie o arquivo **example.full.app.yml** para **app.yml**
4. execute `npm i` para instalar os pacotes necessários.
5. execute `npm run build:full` para compilar o bot.
6. execute `npm start` para iniciar o bot.
7. **Aproveite ouvindo música com o tainy!**

## [![Repl.it](https://img.shields.io/badge/Repl.it-1C2333?style=for-the-badge&logo=replit&logoColor=orange)](https://replit.com/@RainyXeon/Tainy)

1. [Clique Aqui](https://replit.com/@RainyXeon/Tainy) e faça um fork do repl.
2. preencha **app.yml** com `TOKEN` e `NODES`
3. Inicie o bot usando o botão **Run**.
4. **Aproveite ouvindo música com o tainy!**

## ⚙️ Guia

Para um guia avançado de instalação e configuração, confira a aba **Wiki** ou [Clique Aqui!](https://github.com/RainyXeon/Tainy/wiki)

## 📜 Política de Versionamento

tainy segue o [Versionamento Semântico](https://semver.org/)

O número da versão é composto pelas seguintes partes:

    MAJOR mudanças quebradoras
    MINOR novas funcionalidades compatíveis com versões anteriores
    PATCH correções de bugs compatíveis com versões anteriores
    BUILD metadados de construção adicionais
    PRERELEASE versão pré-lançamento

Os números de versão podem vir em diferentes combinações, dependendo do tipo de lançamento:

    `MAJOR.MINOR.PATCH` - Lançamento estável
    `MAJOR.MINOR.PATCH+BUILD` - Lançamento estável com metadados de construção adicionais
    `MAJOR.MINOR.PATCH-PRERELEASE` - Pré-lançamento
    `MAJOR.MINOR.PATCH-PRERELEASE+BUILD` - Pré-lançamento com metadados de construção adicionais

## 📃 Equipe de Tradução (Idiomas)

- [x] **en (Inglês)**
  - [@RainyXeon](https://github.com/RainyXeon) **Discord:** `rainyxeon`
- [x] **vi (Vietnamita)**
  - [@RainyXeon](https://github.com/RainyXeon) **Discord:** `rainyxeon`
- [x] **hi (Hindi)**
  - [@anas-ike](https://github.com/anas-ike) **Discord:** `lights.out.`
- [x] **ko (Coreano)**
  - [@EmuPIKin](https://github.com/EmuPIKin) **Discord:** `emupikin`
- [x] **ru (Russo)**
  - [@AutoP1ayer](https://github.com/AutoP1ayer) **Discord:** `autoplayer.uwu`
- [x] **th (Tailandês)**
  - [@SillyDark](https://github.com/SillyDark) **Discord:** `defectsocute`
- [x] **pt (Brazilian Portuguese)**
  - [@psycodeliccircus](https://github.com/psycodeliccircus) **Discord:** `renildomrc`

## ⁉ Quer fazer parte da equipe de tradução?

- [Crowdin](https://crowdin.com/project/tainy)

## 💫 Agradecimentos Especiais

- [@DarrenOfficial](https://github.com/DarrenOfficial) [Fontes do Lavalink]
- [@PAINFUEG0](https://github.com/PAINFUEG0) [Meu Amigo]
- [@Adivise](https://github.com/Adivise) [Inspiração]
- [@brblacky](https://github.com/brblacky) [Inspiração]
- [@mrstebo](https://github.com/mrstebo) [Analizador de env]
- [@ItzZoldy](https://github.com/ItzZoldy) [Designer]

**E a Todos que Favoritaram e Contribuíram para Meu Projeto 💖**

## 💫 Créditos:

- [@RainyXeon](https://github.com/RainyXeon) **Discord:** `rainyxeon` Como proprietário e criador deste projeto
