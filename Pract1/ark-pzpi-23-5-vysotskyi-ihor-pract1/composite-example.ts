// ============================================================
// Шаблон (патерн) проєктування: Composite
// Мова реалізації: TypeScript
// Приклад: Файлова система (файли та директорії)
// ============================================================

// --- Component: спільний інтерфейс ---
interface FileSystemComponent {
  getName(): string;
  getSize(): number;
  display(indent?: string): void;
}

// --- Leaf: файл (листковий елемент) ---
class File implements FileSystemComponent {
  constructor(
    private name: string,
    private size: number
  ) {}

  getName(): string {
    return this.name;
  }

  getSize(): number {
    return this.size;
  }

  display(indent: string = ""): void {
    console.log(`${indent}📄 ${this.name} (${this.size} KB)`);
  }
}

// --- Composite: директорія (складений елемент) ---
class Directory implements FileSystemComponent {
  private children: FileSystemComponent[] = [];

  constructor(private name: string) {}

  add(component: FileSystemComponent): void {
    this.children.push(component);
  }

  remove(component: FileSystemComponent): void {
    const idx = this.children.indexOf(component);
    if (idx !== -1) {
      this.children.splice(idx, 1);
    }
  }

  getChild(index: number): FileSystemComponent {
    return this.children[index];
  }

  getName(): string {
    return this.name;
  }

  getSize(): number {
    return this.children.reduce(
      (sum, child) => sum + child.getSize(),
      0
    );
  }

  display(indent: string = ""): void {
    console.log(`${indent}📁 ${this.name} (${this.getSize()} KB)`);
    this.children.forEach((child) => child.display(indent + "  "));
  }
}

// --- Client: використання патерну ---
function main(): void {
  // Створення листкових елементів (файлів)
  const file1 = new File("index.ts", 12);
  const file2 = new File("app.tsx", 24);
  const file3 = new File("style.css", 8);
  const file4 = new File("utils.ts", 15);
  const file5 = new File("README.md", 3);
  const file6 = new File("package.json", 2);

  // Створення композитних елементів (директорій)
  const srcDir = new Directory("src");
  srcDir.add(file1);
  srcDir.add(file2);
  srcDir.add(file3);

  const libDir = new Directory("lib");
  libDir.add(file4);

  srcDir.add(libDir);

  const rootDir = new Directory("project");
  rootDir.add(srcDir);
  rootDir.add(file5);
  rootDir.add(file6);

  // Клієнт працює з деревом через єдиний інтерфейс
  console.log("=== Структура файлової системи ===");
  rootDir.display();

  console.log("\n=== Розмір окремих компонентів ===");
  console.log(`Файл '${file1.getName()}': ${file1.getSize()} KB`);
  console.log(`Директорія '${srcDir.getName()}': ${srcDir.getSize()} KB`);
  console.log(`Кореневий каталог '${rootDir.getName()}': ${rootDir.getSize()} KB`);

  // Демонстрація видалення
  console.log("\n=== Після видалення style.css ===");
  srcDir.remove(file3);
  rootDir.display();
}

main();
