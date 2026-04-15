// Claude Sonnet 4.6
// ============================================================
// Архітектура Discord: Приклади програмного коду
// Демонстрація архітектурних принципів через публічне API
// Мови: TypeScript, Elixir, CQL (Cassandra/ScyllaDB)
// ============================================================


// ============================================================
// 1. Gateway WebSocket — підключення до Discord Gateway
//    Демонструє: WebSocket-архітектуру, heartbeat-механізм,
//    event-driven підхід, opcode-протокол
// ============================================================

import WebSocket from "ws";

const DISCORD_GATEWAY_URL = "wss://gateway.discord.gg/?v=10&encoding=json";

// Opcodes Discord Gateway протоколу
enum GatewayOpcode {
  Dispatch = 0,         // Подія від сервера
  Heartbeat = 1,        // Heartbeat (клієнт → сервер)
  Identify = 2,         // Ідентифікація при підключенні
  Resume = 6,           // Відновлення з'єднання
  Reconnect = 7,        // Сервер вимагає перепідключення
  InvalidSession = 9,   // Невалідна сесія
  Hello = 10,           // Перше повідомлення від сервера
  HeartbeatAck = 11,    // Підтвердження heartbeat
}

interface GatewayPayload {
  op: GatewayOpcode;
  d: unknown;
  s: number | null;     // Sequence number для resume
  t: string | null;     // Event name (тільки для op=0)
}

class DiscordGatewayClient {
  private ws: WebSocket | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastSequence: number | null = null;
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  connect(): void {
    this.ws = new WebSocket(DISCORD_GATEWAY_URL);

    this.ws.on("open", () => {
      console.log("[Gateway] З'єднання встановлено");
    });

    this.ws.on("message", (data: string) => {
      const payload: GatewayPayload = JSON.parse(data);
      this.handlePayload(payload);
    });

    this.ws.on("close", (code: number) => {
      console.log(`[Gateway] З'єднання закрито: ${code}`);
      this.stopHeartbeat();
    });
  }

  private handlePayload(payload: GatewayPayload): void {
    // Зберігаємо sequence для можливого resume
    if (payload.s !== null) {
      this.lastSequence = payload.s;
    }

    switch (payload.op) {
      case GatewayOpcode.Hello:
        // Перше повідомлення — починаємо heartbeat
        const { heartbeat_interval } = payload.d as {
          heartbeat_interval: number;
        };
        this.startHeartbeat(heartbeat_interval);
        this.identify();
        break;

      case GatewayOpcode.HeartbeatAck:
        console.log("[Gateway] Heartbeat ACK отримано");
        break;

      case GatewayOpcode.Dispatch:
        // Event-driven: обробка подій від Discord
        this.handleEvent(payload.t!, payload.d);
        break;

      case GatewayOpcode.Reconnect:
        console.log("[Gateway] Сервер вимагає перепідключення");
        this.reconnect();
        break;
    }
  }

  // Heartbeat — механізм підтримки з'єднання
  // Discord закриє WebSocket якщо не отримає heartbeat
  private startHeartbeat(intervalMs: number): void {
    this.sendHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, intervalMs);
  }

  private sendHeartbeat(): void {
    this.send({ op: GatewayOpcode.Heartbeat, d: this.lastSequence });
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }

  // Identify — ідентифікація бота з токеном та intents
  // Intents визначають які події бот отримуватиме
  private identify(): void {
    this.send({
      op: GatewayOpcode.Identify,
      d: {
        token: this.token,
        intents: 513, // GUILDS | GUILD_MESSAGES
        properties: {
          os: "linux",
          browser: "custom-client",
          device: "custom-client",
        },
      },
    });
  }

  // Event-driven обробка — кожна подія має свій тип
  private handleEvent(eventName: string, data: unknown): void {
    switch (eventName) {
      case "READY":
        console.log("[Gateway] Бот підключений та готовий");
        break;
      case "MESSAGE_CREATE":
        console.log("[Gateway] Нове повідомлення отримано");
        break;
      case "GUILD_CREATE":
        console.log("[Gateway] Інформація про сервер отримана");
        break;
    }
  }

  private reconnect(): void {
    this.ws?.close();
    this.connect();
  }

  private send(data: object): void {
    this.ws?.send(JSON.stringify(data));
  }
}


// ============================================================
// 2. REST API — взаємодія з Discord HTTP API
//    Демонструє: REST-архітектуру, rate limiting,
//    CRUD-операції на ресурсах Discord
// ============================================================

const DISCORD_API_BASE = "https://discord.com/api/v10";

interface DiscordMessage {
  id: string;
  channel_id: string;
  author: { id: string; username: string };
  content: string;
  timestamp: string;
}

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  guild_id: string;
}

class DiscordRestClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  // Базовий HTTP-запит з обробкою Rate Limiting
  // Discord обмежує кількість запитів (429 Too Many Requests)
  private async request<T>(
    method: string,
    endpoint: string,
    body?: object
  ): Promise<T> {
    const response = await fetch(`${DISCORD_API_BASE}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bot ${this.token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // Rate Limit — архітектурне рішення Discord
    // для захисту від перевантаження
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      console.log(`[Rate Limit] Очікування ${retryAfter}с`);
      await new Promise((r) =>
        setTimeout(r, Number(retryAfter) * 1000)
      );
      return this.request<T>(method, endpoint, body);
    }

    return response.json() as Promise<T>;
  }

  // Отримання повідомлень каналу
  async getMessages(
    channelId: string,
    limit: number = 50
  ): Promise<DiscordMessage[]> {
    return this.request<DiscordMessage[]>(
      "GET",
      `/channels/${channelId}/messages?limit=${limit}`
    );
  }

  // Надсилання повідомлення
  async sendMessage(
    channelId: string,
    content: string
  ): Promise<DiscordMessage> {
    return this.request<DiscordMessage>(
      "POST",
      `/channels/${channelId}/messages`,
      { content }
    );
  }

  // Отримання каналів серверу (guild)
  async getGuildChannels(
    guildId: string
  ): Promise<DiscordChannel[]> {
    return this.request<DiscordChannel[]>(
      "GET",
      `/guilds/${guildId}/channels`
    );
  }
}


// ============================================================
// 3. Discord Bot з обробкою подій
//    Демонструє: event-driven архітектуру, інтеграцію
//    Gateway (WebSocket) + REST API
// ============================================================

class SimpleDiscordBot {
  private gateway: DiscordGatewayClient;
  private rest: DiscordRestClient;

  constructor(token: string) {
    this.gateway = new DiscordGatewayClient(token);
    this.rest = new DiscordRestClient(token);
  }

  // Точка входу — підключення до Gateway
  start(): void {
    console.log("[Bot] Запуск...");
    this.gateway.connect();
  }

  // Обробка вхідного повідомлення
  // Gateway отримує подію → REST API відправляє відповідь
  async onMessageCreate(message: DiscordMessage): Promise<void> {
    if (message.content === "!ping") {
      await this.rest.sendMessage(
        message.channel_id,
        "Pong! Затримка Gateway: <X>мс"
      );
    }

    if (message.content === "!архітектура") {
      await this.rest.sendMessage(
        message.channel_id,
        [
          "**Архітектура Discord:**",
          "• Gateway: Elixir + BEAM VM (WebSocket)",
          "• API: Python (Django REST)",
          "• Voice: Rust + WebRTC",
          "• DB: ScyllaDB + PostgreSQL + Redis",
        ].join("\n")
      );
    }
  }
}


// ============================================================
// 4. Elixir: GenServer для Guild (концептуальний приклад)
//    Демонструє: як Discord внутрішньо реалізує
//    кожен сервер як окремий процес на BEAM VM
// ============================================================

/*
  # Кожен guild (сервер Discord) — окремий GenServer процес
  # Це забезпечує ізоляцію та відмовостійкість

  defmodule Discord.GuildServer do
    use GenServer

    # Стан guild: учасники, канали, ролі
    defstruct [:id, :name, members: %{}, channels: []]

    # Ініціалізація при створенні/завантаженні серверу
    def init(guild_id) do
      state = load_guild_from_db(guild_id)
      {:ok, state}
    end

    # Обробка нового повідомлення — fan-out всім підписникам
    def handle_cast({:message, channel_id, msg}, state) do
      subscribers = get_channel_subscribers(state, channel_id)

      Enum.each(subscribers, fn pid ->
        send(pid, {:new_message, channel_id, msg})
      end)

      {:noreply, state}
    end

    # Користувач приєднується до серверу
    def handle_cast({:member_join, user_id, pid}, state) do
      new_members = Map.put(state.members, user_id, pid)
      {:noreply, %{state | members: new_members}}
    end

    # Користувач виходить з серверу
    def handle_cast({:member_leave, user_id}, state) do
      new_members = Map.delete(state.members, user_id)
      {:noreply, %{state | members: new_members}}
    end

    # Отримання кількості онлайн-учасників
    def handle_call(:member_count, _from, state) do
      {:reply, map_size(state.members), state}
    end
  end

  # Supervisor — автоматичний перезапуск при збоях
  defmodule Discord.GuildSupervisor do
    use DynamicSupervisor

    def start_guild(guild_id) do
      DynamicSupervisor.start_child(
        __MODULE__,
        {Discord.GuildServer, guild_id}
      )
    end
  end
*/


// ============================================================
// 5. CQL: Схема зберігання повідомлень (ScyllaDB)
//    Демонструє: партиціювання за channel_id + bucket,
//    оптимізацію для читання останніх повідомлень
// ============================================================

/*
  -- Таблиця повідомлень Discord
  -- Партиціювання: (channel_id, bucket) — розподіл даних
  -- Кластеризація: message_id DESC — останні повідомлення першими
  -- Bucket — часове вікно (наприклад, 10 днів)

  CREATE TABLE discord.messages (
    channel_id  bigint,
    bucket      int,
    message_id  bigint,
    author_id   bigint,
    content     text,
    timestamp   timestamp,
    edited_at   timestamp,
    attachments list<text>,
    embeds      list<text>,
    PRIMARY KEY ((channel_id, bucket), message_id)
  ) WITH CLUSTERING ORDER BY (message_id DESC)
    AND compaction = {
      'class': 'TimeWindowCompactionStrategy',
      'compaction_window_size': 7,
      'compaction_window_unit': 'DAYS'
    }
    AND gc_grace_seconds = 864000;

  -- Запит: отримати останні 50 повідомлень каналу
  SELECT * FROM discord.messages
    WHERE channel_id = 123456789
      AND bucket = 2025042
    ORDER BY message_id DESC
    LIMIT 50;

  -- Bucket обчислюється як: (timestamp / bucket_size)
  -- Це обмежує розмір партиції та запобігає "hot partitions"
*/


// ============================================================
// 6. Rust NIF: SortedSet для списків учасників
//    Демонструє: інтеграцію Rust з Elixir через NIF
//    для критичних за продуктивністю операцій
// ============================================================

/*
  // Rust: Структура SortedSet для зберігання учасників
  // Використовується у Discord для member list кожного guild
  // Забезпечує O(log n) вставку та видалення

  use rustler::{Encoder, Env, NifResult, Term};

  struct SortedSet {
      buckets: Vec<Vec<Term>>,
      bucket_size: usize,
  }

  impl SortedSet {
      fn new(bucket_size: usize) -> Self {
          SortedSet {
              buckets: Vec::new(),
              bucket_size,
          }
      }

      // Додавання елементу — знаходить потрібний bucket,
      // виконує binary search всередині
      fn add(&mut self, term: Term) -> bool {
          let bucket_idx = self.find_bucket(&term);
          let bucket = &mut self.buckets[bucket_idx];

          match bucket.binary_search(&term) {
              Ok(_) => false,  // Елемент вже існує
              Err(pos) => {
                  bucket.insert(pos, term);
                  // Розділяємо bucket якщо він переповнений
                  if bucket.len() > self.bucket_size * 2 {
                      self.split_bucket(bucket_idx);
                  }
                  true
              }
          }
      }

      // Видалення елементу
      fn remove(&mut self, term: &Term) -> bool {
          let bucket_idx = self.find_bucket(term);
          let bucket = &mut self.buckets[bucket_idx];

          match bucket.binary_search(term) {
              Ok(pos) => {
                  bucket.remove(pos);
                  true
              }
              Err(_) => false,
          }
      }
  }

  // NIF-функції, доступні з Elixir
  #[rustler::nif]
  fn sorted_set_new(bucket_size: usize) -> SortedSet {
      SortedSet::new(bucket_size)
  }

  #[rustler::nif]
  fn sorted_set_add(set: &mut SortedSet, term: Term)
    -> bool {
      set.add(term)
  }
*/


// ============================================================
// Точка входу — запуск бота
// ============================================================

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || "YOUR_TOKEN";
const bot = new SimpleDiscordBot(BOT_TOKEN);
bot.start();
