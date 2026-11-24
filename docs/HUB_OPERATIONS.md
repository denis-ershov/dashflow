# DashFlow Hub: локальный запуск и эксплуатация

Документ описывает локальную разработку и запуск Hub как пользовательской службы. Он не заменяет `docs/SECURITY_ARCHITECTURE.md` и не описывает синхронизацию расширения.

## Требования и безопасные значения по умолчанию

- Node.js **22.13 или новее**; база использует встроенный `node:sqlite`.
- В Node 22 встроенный SQLite API помечен экспериментальным и может выводить `ExperimentalWarning` при запуске; обновляйте runtime в рамках отдельного изменения и проверяйте совместимость базы.
- Hub слушает `127.0.0.1:47831`. Сервис не доступен из локальной сети, пока владелец явно не изменит адрес.
- Конфигурация и SQLite хранятся в `~/.dashflow-hub/`: `config.json` и `hub.sqlite`.
- На Linux и macOS каталог создаётся с правами `0700`, файл конфигурации — `0600`; SQLite-файл — `0600`. На Windows POSIX-режимы не применяются: доступ ограничивается ACL профиля пользователя, под которым запущен Hub.
- Для браузерного сопряжения задаётся точный origin расширения, например `chrome-extension://<32-символьный-id>`. Не используйте wildcard-origin.
- `pair` выдаёт одноразовый 6-значный код, действующий 5 минут. Код привязывается к origin. CLI печатает код при создании; перед повторным сопряжением создайте новый.
- `token create` выводит секретный токен только один раз. `token list` показывает только метаданные; токен нельзя восстановить из Hub. При утечке используйте `token revoke` и создайте новый.

## Настройка

Первый запуск создаёт конфигурацию с loopback-адресом и пустым allowlist origin-ов. Отредактируйте `config.json` до сопряжения:

```json
{
  "host": "127.0.0.1",
  "port": 47831,
  "databasePath": "/home/alice/.dashflow-hub/hub.sqlite",
  "extensionOrigins": ["chrome-extension://abcdefghijklmnopabcdefghijklmnop"],
  "writesPerMinute": 60
}
```

Путь базы может быть относительным; тогда он разрешается относительно каталога `config.json`. Для Windows используйте абсолютный путь в JSON, например `C:\\Users\\Alice\\.dashflow-hub\\hub.sqlite`.

Переменные `DASHFLOW_HUB_*` перекрывают соответствующие поля JSON:

| Переменная                       | Поле               | Пример                                           |
| -------------------------------- | ------------------ | ------------------------------------------------ |
| `DASHFLOW_HUB_CONFIG`            | путь к JSON        | `C:\\Users\\Alice\\.dashflow-hub\\config.json`   |
| `DASHFLOW_HUB_HOST`              | `host`             | `127.0.0.1`                                      |
| `DASHFLOW_HUB_PORT`              | `port`             | `47831`                                          |
| `DASHFLOW_HUB_DB_PATH`           | `databasePath`     | `/var/lib/dashflow-hub/hub.sqlite`               |
| `DASHFLOW_HUB_EXTENSION_ORIGINS` | `extensionOrigins` | `chrome-extension://<id>,moz-extension://<uuid>` |
| `DASHFLOW_HUB_WRITES_PER_MINUTE` | `writesPerMinute`  | `60`                                             |

`host` принимает только IP-адрес. Не задавайте `0.0.0.0` или `::`, если вы намеренно не настраиваете сетевой доступ. Порт — от 1 до 65535; лимит записи — от 1 до 10000 запросов в минуту.

## Локальная разработка и команды CLI

Из корня репозитория:

```sh
npm ci
npm run build:hub
npm run start -w dashflow-hub
```

`start` поднимает Hub в текущем терминале. Для одноразовой команды можно вызвать `node hub/dist/cli.js` из корня репозитория. Справка: `node hub/dist/cli.js --help`.

Сопряжение с расширением:

```sh
node hub/dist/cli.js pair --origin chrome-extension://<точный-id>
```

Команда создаёт код в базе Hub и завершает работу. Введите этот код в настройках расширения в течение пяти минут. Origin должен быть заранее указан в `extensionOrigins`.

Создание отдельного токена для агента и отзыв:

```sh
node hub/dist/cli.js token create "Local agent" --scope items:read,items:write
node hub/dist/cli.js token list
node hub/dist/cli.js token revoke <token-id>
```

Выдавайте только необходимые scope. Поддерживаются `items:read`, `items:write`, `items:manage`, `boards:read`, `boards:write`, `digests:write` и `sync`. Храните токен в менеджере секретов; не передавайте его через URL или команду, попадающую в shell history.

## Автозапуск в Windows Task Scheduler

Запускайте задачу от обычной учётной записи владельца данных, без повышения прав.

1. Соберите Hub из checkout: `npm ci`, затем `npm run build:hub`.
2. Откройте **Task Scheduler → Create Task**. Назовите задачу `DashFlow Hub`.
3. На вкладке **General** выберите **Run only when user is logged on** и снимите **Run with highest privileges**.
4. Добавьте триггер **At log on** для этой учётной записи.
5. Добавьте действие **Start a program**:
   - Program: полный путь к `node.exe`, например `C:\Program Files\nodejs\node.exe`.
   - Arguments: полный путь к `hub\\dist\\cli.js` и `serve`, например `"C:\\src\\dashflow\\hub\\dist\\cli.js" serve`.
   - Start in: корень checkout, например `C:\\src\\dashflow`.
6. В **Settings** включите повторный запуск при сбое с задержкой в одну минуту и ограничьте число попыток. Не создавайте несколько параллельных экземпляров.

При необходимости задайте переменные среды для этой задачи через обёрточный PowerShell-скрипт. Не храните в нём токены. Файлы в `%USERPROFILE%\\.dashflow-hub` принадлежат запускающему пользователю; проверьте ACL каталога и резервные копии.

## Автозапуск в systemd (user service)

Сначала соберите Hub. Создайте `~/.config/systemd/user/dashflow-hub.service`, заменив `/home/alice/src/dashflow` на checkout:

```ini
[Unit]
Description=DashFlow Hub
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/alice/src/dashflow
ExecStart=/usr/bin/node /home/alice/src/dashflow/hub/dist/cli.js serve
Restart=on-failure
RestartSec=5s
KillSignal=SIGINT
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=%h/.dashflow-hub

[Install]
WantedBy=default.target
```

Активируйте службу:

```sh
systemctl --user daemon-reload
systemctl --user enable --now dashflow-hub.service
systemctl --user status dashflow-hub.service
journalctl --user -u dashflow-hub.service -f
```

Служба работает в пользовательском контексте и использует его `~/.dashflow-hub`. Включайте lingering (`loginctl enable-linger <user>`) только если Hub действительно должен работать без активной пользовательской сессии.

## Автозапуск в macOS launchd

Соберите Hub и создайте `~/Library/LaunchAgents/com.dashflow.hub.plist`. В `ProgramArguments` укажите фактические пути к Node и checkout:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.dashflow.hub</string>
  <key>ProgramArguments</key>
  <array>
    <string>/opt/homebrew/bin/node</string>
    <string>/Users/alice/src/dashflow/hub/dist/cli.js</string>
    <string>serve</string>
  </array>
  <key>WorkingDirectory</key><string>/Users/alice/src/dashflow</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/Users/alice/Library/Logs/dashflow-hub.log</string>
  <key>StandardErrorPath</key><string>/Users/alice/Library/Logs/dashflow-hub-error.log</string>
</dict>
</plist>
```

Создайте каталог логов, затем загрузите агент:

```sh
mkdir -p ~/Library/Logs
chmod 600 ~/Library/LaunchAgents/com.dashflow.hub.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.dashflow.hub.plist
launchctl print gui/$(id -u)/com.dashflow.hub
```

Остановить и выгрузить: `launchctl bootout gui/$(id -u)/com.dashflow.hub`. Логи содержат сообщения запуска и ошибки, но CLI не пишет токены.

## Docker

Dockerfile использует workspace build из корня репозитория и Node 22. В контейнере процесс работает от пользователя `node`; директория конфигурации и базы монтируется как постоянное хранилище.

```sh
docker build -t dashflow-hub:local -f hub/Dockerfile .
docker run -d --name dashflow-hub --restart unless-stopped \
  -p 127.0.0.1:47831:47831 \
  -e DASHFLOW_HUB_EXTENSION_ORIGINS=chrome-extension://<точный-id> \
  -v "$HOME/.dashflow-hub:/home/node/.dashflow-hub" \
  dashflow-hub:local
docker logs -f dashflow-hub
```

В образе Hub слушает `0.0.0.0:47831` внутри контейнера, чтобы Docker мог направить трафик. Публикация порта привязана к loopback **хоста**. На PowerShell вместо `$HOME` используйте `$env:USERPROFILE` в bind mount. Не публикуйте порт на публичном интерфейсе.

Если нужен доступ к Hub снаружи машины, используйте только TLS-терминирующий reverse proxy (например, Caddy) с upstream на `127.0.0.1:47831`. Оставьте Docker bind на `127.0.0.1`, настройте точный allowlist origin-ов, firewall и HTTPS на прокси; не открывайте незашифрованный порт Hub напрямую в Интернет или LAN. Обратные proxy-заголовки Hub не использует для авторизации.

Остановка: `docker stop dashflow-hub`. Обновление образа сохраняет данные в смонтированном каталоге; резервное копирование каталога выполняйте при остановленном контейнере либо штатным согласованным снимком SQLite.

## Резервное копирование и восстановление

Остановите службу перед копированием `hub.sqlite` вместе с возможными SQLite sidecar-файлами. Храните копию в каталоге с ограниченными правами и периодически проверяйте восстановление на отдельном временном каталоге. Не переносите профиль пользователя или секреты в тестовую среду. После компрометации токена отзовите его, выдайте замену и проверьте журналы доступа.

## Установка из локального пакета

Публикация npm или Docker-образа требует отдельного релизного решения и проверки:

- `npm run pack:hub` собирает `.output/dashflow-hub-0.1.0.tgz` с CLI, OpenAPI, лицензией, этим руководством и сборкой общей библиотеки. Пакет можно установить в отдельном проекте через `npm install /путь/к/dashflow-hub-0.1.0.tgz` и запустить командой `npx dashflow-hub`.
- Публикация в npm требует решения владельца о доступе к пакету и настройке provenance. Текущая сборка помечена как приватная, чтобы локальный архив нельзя было опубликовать случайно.
- Для Docker нужны согласованные версионированные теги, CI-публикация registry image, SBOM/сканирование образа, multi-arch решение и политика обновления базового Node image. До этого используйте локально собранный `dashflow-hub:local`.
- Этот шаг ничего не публикует, не создаёт секреты релиза и не меняет production-конфигурацию.
