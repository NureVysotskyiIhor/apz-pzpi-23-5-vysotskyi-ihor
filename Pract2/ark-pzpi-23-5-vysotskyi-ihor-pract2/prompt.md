Загальна характеристика Discord: рік заснування, компанія, кількість користувачів (MAU), кількість серверів, обсяг голосового трафіку на день, цільова аудиторія.
Технологічний стек: які мови програмування використовуються і для чого (Elixir, Rust, Python, C++, TypeScript). Які фреймворки та рантайми (BEAM VM, Django, WebRTC). Які бази даних (ScyllaDB, PostgreSQL, Redis, колишня Cassandra). Клієнтські застосунки (Electron, React Native, React).
Архітектурний стиль: мікросервісна vs монолітна частини. Чому Python API залишився монолітом. Скільки мікросервісів на Elixir. Event-driven комунікація через pub/sub.
Real-time на Elixir/BEAM: чому обрали Elixir, як працює BEAM VM (легковагові процеси), скільки WebSocket-подій за секунду обробляється, скільки одночасних користувачів. Як кожен guild — окремий процес GenServer. Supervisor tree та hot code reload.
Голосовий стек на Rust: чому Rust (відсутність GC, безпека пам’яті), WebRTC через UDP, SFU-архітектура, Rust NIF для Elixir (SortedSet — приріст у 160 разів). Посилання: discord.com/blog «Using Rust to Scale Elixir for 11 Million Concurrent Users».
Еволюція зберігання даних: MongoDB (2015) → Cassandra (2017, 12 нод) → проблеми Cassandra (2022, 177 нод, GC pauses, latency spikes) → ScyllaDB (2023, C++ замість Java, shard-per-core, P99 latency 185 ms → 1.4 ms). CQL-схема таблиці messages. Посилання: blog.bytebytego.com «How Discord Stores Trillions of Messages».
Проблеми та критика (ВАЖЛИВО — потрібен чесний аналіз):
Відсутність E2E-шифрування повідомлень
Збір даних через /api/track і /api/science без згоди
Витоки даних (2023 — discord.io, 2025 — сторонній сервіс підтримки — паспорти)
«Чорна діра знань» — контент серверів не індексується пошуковими системами
Зміни Privacy Policy для AI (Clyde/OpenAI)
Штраф CNIL за порушення GDPR
Закритий вихідний код
Масштабування: як Discord обслуговував 15 млн користувачів на одному сервері (кейс Midjourney). Посилання: blog.bytebytego.com.