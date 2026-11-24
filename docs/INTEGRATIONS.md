# Входящие интеграции DashFlow Hub

## Универсальный webhook

Создайте отдельный credential для каждого источника:

```sh
dashflow-hub webhook create "CRM"
dashflow-hub webhook list
dashflow-hub webhook revoke <webhook-id>
```

`create` один раз выводит URL пути и signing key. Сохраните оба в секретном хранилище интеграции: Hub хранит хеш URL-токена и использует signing key для проверки подписи. Повторно получить секреты нельзя. `list` показывает только id, имя, состояние и дату создания. При компрометации выполните `revoke` и создайте новый credential.

Отправитель делает `POST` по выданному URL с `Content-Type: application/json` и тремя заголовками:

- `X-Dashflow-Timestamp`: Unix-время в миллисекундах, ровно 13 десятичных цифр;
- `X-Dashflow-Delivery`: уникальный идентификатор доставки, 1–80 символов из `A-Z`, `a-z`, `0-9`, `_`, `.`, `-`;
- `X-Dashflow-Signature`: `sha256=` и 64 строчные шестнадцатеричные цифры.

Подпись рассчитывается как HMAC-SHA256 с выданным signing key над следующими байтами:

```text
UTF8(timestamp + "." + deliveryId + ".") || rawRequestBody
```

`rawRequestBody` — точные байты JSON-тела, отправляемые по сети, до разбора или повторной сериализации JSON. Подписывается именно это тело, а не его распарсенное представление. Подпись hex-кодируется строчными буквами; к результату добавляется префикс `sha256=`.

```text
signature = "sha256=" + hexLower(HMAC_SHA256(signingKey, signedBytes))
```

Время должно отличаться от часов Hub не более чем на пять минут. `deliveryId` используется для идемпотентности повторной доставки. Запросы с заголовком `Origin` отклоняются; не отправляйте его. Успешный запрос создаёт item во входящих. Контракт входного payload и ответов описан в [`hub/openapi.yaml`](../hub/openapi.yaml), ограничение частоты, журнал аудита и эксплуатация — в [руководстве оператора](HUB_OPERATIONS.md#вебхуки).

URL-токен находится в пути запроса, поэтому прокси и серверные access logs должны маскировать сегмент `/v1/webhooks/in/{token}`. Не включайте URL и signing key в логи, исходники, тикеты или клиентские bundle. Храните их как секреты и ограничьте доступ к ним.

### Сопоставление полей webhook

Для credential можно настроить необязательный шаблон в `webhookTemplates` файла конфигурации Hub. Ключ — публичный ID credential из `dashflow-hub webhook create`; значение задаёт тип item и dotted paths в распарсенном JSON payload:

```json
{
  "webhookTemplates": {
    "01J00000000000000000000000": {
      "kind": "task",
      "title": "issue.title",
      "body": "issue.description",
      "url": "issue.html_url"
    }
  }
}
```

ID в примере синтетический. Поддерживаются `task`, `note` и `link`; `title` обязателен, `body` и `url` необязательны. Путь содержит до восьми сегментов, например `issue.title`. Hub читает только собственные свойства объекта, не вычисляет выражения и отклоняет опасные имена сегментов `__proto__`, `constructor` и `prototype`. Значения проходят обычную валидацию item, а созданный item получает `status: "inbox"`. Без шаблона принимается обычный `ItemDraft`.

Шаблон применяется только после успешной HMAC-проверки исходных байтов тела. Он не заменяет timestamp, delivery ID, подпись или защиту от повторной доставки. ID credential не является секретом; URL-токен и signing key остаются секретами и не должны попадать в конфигурацию шаблонов.

## Подключение коннекторов Hub

Откройте `config.json` Hub и добавьте нужные разделы `integrations`. После изменения перезапустите Hub. Пропущенные разделы остаются выключенными. Состояние, последнюю успешную синхронизацию и ошибки видно в настройках DashFlow на вкладке «Интеграции».

```json
{
  "integrations": {
    "github": {
      "login": "example-user",
      "repositories": ["example-org/project"],
      "intervalMinutes": 5
    },
    "telegram": {
      "allowedChatIds": ["123456789"],
      "intervalMinutes": 1
    },
    "calendar": {
      "allowedHostname": "calendar.example.org",
      "timezone": "Europe/Moscow",
      "intervalMinutes": 5
    },
    "mail": {
      "host": "imap.example.org",
      "allowedSenders": ["summary@example.org"],
      "subjectIncludes": "report",
      "intervalMinutes": 60
    }
  }
}
```

- **GitHub** получает токен из `DASHFLOW_HUB_GITHUB_TOKEN`. По умолчанию задачи приходят во «Входящие». Укажите `boardId` и `columnId` вместе для выбранной доски. Hub читает назначенные открытые задачи и pull request, запросы ревью и личные упоминания, доступные через поиск GitHub. [Архитектура GitHub](GITHUB_CONNECTOR_ARCHITECTURE.md)
- **Telegram** получает токен из `DASHFLOW_HUB_TELEGRAM_TOKEN`. Hub читает сообщения только из разрешённых чатов. Для напоминаний добавьте `reminderChatId` из этого списка. Получатель видит заголовок записи. [Архитектура Telegram](TELEGRAM_CONNECTOR_ARCHITECTURE.md)
- **Календарь** получает секретный HTTPS-адрес из `DASHFLOW_HUB_CALENDAR_ICS_URL`. Hub проверяет точный хост и заменяет снимок при успешной загрузке. «Повестка» использует снимок Hub, когда у неё отсутствует собственная прямая ICS-подписка. [Архитектура календаря](CALENDAR_CONNECTOR_ARCHITECTURE.md)
- **Почта** читает разрешённые адреса через IMAP по TLS. Для входа задайте `DASHFLOW_HUB_IMAP_USERNAME` и `DASHFLOW_HUB_IMAP_PASSWORD`. В локальный дайджест за предыдущие сутки UTC попадают отправитель и тема. [Архитектура почты](MAIL_CONNECTOR_ARCHITECTURE.md)

Секреты задаются в окружении службы или контейнера. Браузер получает только состояние коннекторов, коды ошибок и данные для виджетов. Команда «Запустить синхронизацию» планирует опрос с учётом интервала повторов.
