# Инструкция по работе

Как поднять, настроить и пользоваться Guardrail Wallet. Кратко и по шагам.

---

## 1. Что это и как устроено

Ты кладёшь деньги на кошелёк. Твой **агент** просит кошелёк что-то оплатить.
Кошелёк сам решает по твоим правилам:

- мелкое и доверенное (продукты, подписка) — **проходит само**;
- запрещённое (вывод крипты и т.п.) — **отклоняется**;
- всё необычное — **спрашивает тебя**: карточка в Telegram или кнопка в веб-дашборде.

Агент **никогда не двигает деньги сам** — только просит. Решает кошелёк и ты.

Три секрета (не путать!):
- `AGENT_API_KEY` — даёшь агенту. Право **просить** платёж.
- `DASHBOARD_TOKEN` — только твой. Право **одобрять** в вебе.
- ключ владельца on-chain (в проде) — холодный, меняет лимиты и выводит всё.

---

## 2. Запуск (режим без крипты — для проверки)

```bash
npm install
cp .env.example .env            # заполни AGENT_API_KEY и DASHBOARD_TOKEN (разные!)
cp policy.example.yaml policy.yaml
npm run dev                     # старт на порту из .env (PORT)
```

В логе должно быть:
```
[guardrail] listening on :6767 | executor=stub | chain=ton
[guardrail] web dashboard: http://localhost:6767/
```

`EXECUTOR=stub` — деньги не трогаются, «оплата» фейковая (хэши `stub:...`).
Это безопасный режим, чтобы проверить всю логику.

Проверка живости: `curl localhost:6767/health` → `{"ok":true}`.

Остановить: `pkill -f "tsx src/index.ts"`.

---

## 3. Настройка правил — `policy.yaml`

Единственный файл, который ты реально крутишь. Порядок решения (сверху вниз,
fail-closed — что не разрешено явно, идёт к человеку):

1. `kill_switch` / `hard_limits` — потолок (дублируется on-chain).
2. `blocklist` — всегда запрет.
3. `rules` — первое совпавшее правило побеждает.
4. `default` — если ничего не совпало.
5. `auto_approve` — мелочь ниже порога проходит сама (но **не** обходит
   security-правила вроде velocity и не одобряет первого нового получателя).

Примеры частых правок:

```yaml
hard_limits:
  per_tx_max: 200      # больше — только с ключом владельца
  daily_max: 500       # максимум за сутки. ЭТО твой потолок потерь.
  kill_switch: false   # true = заморозить ВСЁ мгновенно

auto_approve:
  under: 25            # платежи меньше $25...
  allow_new_recipient: false   # ...но первому новому всё равно спросить

rules:
  - { name: block, if: { category: [crypto_withdrawal, p2p_transfer] }, then: deny }
  - { name: trusted, if: { category: [groceries, utilities, subscription] }, then: allow }
  - { name: new, if: { recipient_age: new }, then: require_approval }
  - { name: velocity, if: { velocity_24h_over: 300 }, then: require_approval }

default: require_approval
```

После правки `policy.yaml` — перезапусти сервер.

---

## 4. Подтверждения: Telegram и/или веб

### Веб-дашборд
1. Задай `DASHBOARD_TOKEN` в `.env`.
2. Открой `http://localhost:<PORT>/`, введи токен (сохранится в браузере).
3. Видишь все платежи; у `pending` — кнопки **Approve / Reject**.
   Новый получатель помечен красным `NEW`. Список обновляется сам.

### Telegram
1. Создай бота у [@BotFather](https://t.me/BotFather), скопируй токен →
   `TELEGRAM_BOT_TOKEN` в `.env`.
2. Узнай свой numeric id у [@userinfobot](https://t.me/userinfobot) →
   `telegram.owner_chat_id` в `policy.yaml`.
3. Перезапусти. Теперь `require_approval` падает карточкой с кнопками.
   Не ответил за `approval_timeout_sec` (по умолчанию 10 мин) → авто-отказ.

Можно включить и то, и другое одновременно.

---

## 5. Как агент пользуется кошельком

Запрос платежа:

```bash
curl localhost:6767/v1/payments/request \
  -H "Authorization: Bearer <AGENT_API_KEY>" \
  -H "content-type: application/json" \
  -d '{
    "idempotency_key": "уникальный-id-операции",
    "recipient": { "address": "EQ...", "merchant_id": "shop" },
    "amount": { "value": 42.50, "currency": "USD" },
    "category": "groceries",
    "memo": "за что платим"
  }'
```

Ответ:
- `{"status":"executed", "tx_hash":...}` — оплачено;
- `{"status":"rejected", "reason":...}` (HTTP 402) — правило запретило;
- `{"status":"pending_approval", "payment_id":...}` — ждём тебя.

Для `pending` агент опрашивает статус:
```bash
curl localhost:6767/v1/payments/<payment_id> -H "Authorization: Bearer <AGENT_API_KEY>"
```

**`idempotency_key`** обязателен и должен быть уникальным на операцию: повтор с
тем же ключом вернёт прежний результат и **не спишет дважды**.

`memo`/`agent_context` агент может приукрасить — на решение это не влияет,
показывается тебе только как подсказка. Решают сумма и получатель.

---

## 6. Боевой режим (TON) — следующий этап

TON-адаптер уже написан (`src/chain/ton.ts`) — реальный USDT jetton-перевод
session-ключом на Wallet v5 (W5). Для боевого режима:

1. Проверь обвязку без денег: `npm run ton:check` — деривация ключа, коннект к
   testnet, резолв USDT jetton-кошелька против настоящего мастера, сборка тела
   перевода.
2. Заведи **session-кошелёк** (отдельный от владельца), пополни TON на газ и
   USDT. Положи его 24 слова в `TON_SESSION_MNEMONIC`, выстави `EXECUTOR=ton`,
   `TON_NETWORK`, `TON_ENDPOINT`, `TON_USDT_MASTER`.
3. Прогони первый перевод на **testnet** на маленькой сумме.
4. Жёсткий потолок (per-tx/дневной/freeze) должен быть в on-chain
   guardrail-extension (W5 extension) — это следующая веха, до её аудита держи
   `daily_max` маленьким (см. `SECURITY.md`).

Заметка: TON не отдаёт хэш транзакции синхронно — адаптер подтверждает перевод
по росту `seqno` и возвращает ссылку `ton:<wallet>:seqno<n>`.

Потолок потерь по дизайну: даже при взломе сервера уведут максимум `daily_max`
в сутки, и ты жмёшь kill switch (`kill_switch: true`).

---

## 7. Эксплуатация

- **Бэкап** — это один файл `data/wallet.sqlite` (+ `policy.yaml`). Копируй его.
- **Заморозить всё** — `kill_switch: true` в `policy.yaml`, перезапуск. Или, в
  проде, подпись владельца on-chain.
- **Docker** — `docker compose up -d` (нужны `.env` и `policy.yaml` рядом).
- **Логи** — сервер пишет в stdout; в Docker `docker compose logs -f`.

---

## 8. Если что-то не так

| Симптом | Причина / решение |
|---|---|
| `Missing required env var: AGENT_API_KEY` | нет `.env` или пустой ключ |
| `pending` висит и не приходит в телегу | не задан `TELEGRAM_BOT_TOKEN` / неверный `owner_chat_id` |
| дашборд: `bad token` | `DASHBOARD_TOKEN` в `.env` ≠ введённый в браузере |
| admin отдаёт 401 на агентском ключе | так и задумано — одобрять можно только owner-токеном |
| `TonExecutor is not wired yet` | стоит `EXECUTOR=ton`, но адаптер ещё не дописан — верни `stub` |
| порт занят | поменяй `PORT` в `.env` |
