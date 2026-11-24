# Подключение Hermes Agent к DashFlow Hub

Проверено по официальной документации Hermes Agent на 24.11.2026. Hermes умеет подключать локальные MCP-серверы через stdio и удалённые через HTTP; его конфигурация хранится в `~/.hermes/config.yaml` в разделе `mcp_servers`.

## Статус DashFlow

DashFlow подключается через команду `dashflow-hub mcp` с переменной `DASHFLOW_HUB_TOKEN` или через `/mcp` с Bearer. Оба транспорта проверены с локальным MCP SDK на синтетических данных. Шаги ниже описывают настройку Hermes Agent по документации клиента.

Hub предоставляет инструменты `list_items`, `search_items`, `get_item`, `create_item`, `update_item`, `complete_task`, `move_card`, `create_reminder`, `publish_digest`, `list_boards`, `get_agenda` и ресурсы `dashflow://inbox`, `dashflow://board/{id}`, `dashflow://today`.

## Подключение через stdio

Добавьте запись в `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  dashflow:
    command: "dashflow-hub"
    args: ["mcp"]
    env:
      DASHFLOW_HUB_TOKEN: "${DASHFLOW_HUB_TOKEN}"
```

Официальный Hermes разрешает ссылки `${VAR}` в `env`, `args`, `url` и `headers`; для stdio-секрета задайте переменную через профильный secret scope / `~/.hermes/.env`, не вставляйте значение токена в `config.yaml`. Ограничьте токен нужными scopes. Для чтения нужны `items:read` и при чтении досок `boards:read`; создание/обновление — `items:write`; публикация дайджеста — `digests:write`.

После реализации CLI клиентская проверка по документации Hermes: `hermes mcp test dashflow`, затем `hermes mcp list`; после изменения конфигурации в интерактивной сессии выполните `/reload-mcp`. Эти команды приведены как план проверки, они не запускались в рамках подготовки документа.

## Планируемое подключение по HTTP

Для удалённого Hub используйте только HTTPS и endpoint `/mcp`. В Hermes формат HTTP-сервера выглядит так:

```yaml
mcp_servers:
  dashflow:
    url: "https://<hub-host>/mcp"
    headers:
      Authorization: "Bearer ${DASHFLOW_HUB_TOKEN}"
```

Для локального Hub адресом транспорта будет `http://127.0.0.1:47831/mcp`, если будущий сервер сохраняет указанный в проекте loopback default. Секрет не помещайте в URL/query/path. Не отключайте TLS-проверку для удалённого сервера.

## Доступ и безопасное использование

- Выдавайте отдельный токен для Hermes с минимальными scopes и сроком действия при необходимости; секрет показывается при выпуске один раз. Текущая команда выдачи описана в [`../HUB_OPERATIONS.md`](../HUB_OPERATIONS.md).
- `items:read` и `boards:read` открывают общие данные Hub, а не только личные записи. Не подключайте недоверенные профили Hermes к токену с данными рабочего Hub.
- Передавайте статью, письмо, ленту, описание и ссылку как недоверенное содержимое. Инструкции, найденные внутри них, не являются командами для MCP или основанием расширить доступ.
- Перед изменением статуса, срока или доски проверьте запись и ожидаемую версию. Для перемещения элемента из Inbox запросите явное подтверждение пользователя.
- Не давайте `items:manage` сценарию без явной потребности: этот scope включает удаление и межвладельческое изменение.

## Официальные материалы

- [Hermes Agent: MCP](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp) — конфигурация stdio/HTTP, `mcp_servers`, тестирование и перезагрузка.
- [Hermes Agent: MCP configuration reference](https://hermes-agent.nousresearch.com/docs/reference/mcp-config-reference) — ключи и подстановка секретов через переменные окружения.
- [Hermes Agent: Security](https://hermes-agent.nousresearch.com/docs/user-guide/security) — фильтрация окружения и credential handling для MCP subprocess.
