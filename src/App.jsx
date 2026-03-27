import { useEffect, useMemo, useState } from "react";

const STATUSES = [
  { id: "todo", title: "К выполнению" },
  { id: "in-progress", title: "В работе" },
  { id: "done", title: "Готово" },
];

const PRIORITY_LABELS = {
  high: "Высокий",
  medium: "Средний",
  low: "Низкий",
};

const STORAGE_KEY = "daytasks-react-board-v1";

const EMPTY_FORM = {
  title: "",
  description: "",
  priority: "medium",
  estimate: 1,
};

function createSeedTasks() {
  return [
    {
      id: crypto.randomUUID(),
      title: "Согласовать дизайн главной страницы",
      description: "Проверить тексты, цвета и размеры в макете",
      priority: "high",
      estimate: 2,
      status: "todo",
      createdAt: Date.now() - 20000,
    },
    {
      id: crypto.randomUUID(),
      title: "Подготовить API контракт",
      description: "Описать payload и коды ошибок",
      priority: "medium",
      estimate: 3.5,
      status: "in-progress",
      createdAt: Date.now() - 10000,
    },
  ];
}

function readTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedTasks();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : createSeedTasks();
  } catch {
    return createSeedTasks();
  }
}

export default function App() {
  const [tasks, setTasks] = useState(readTasks);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState("");
  const [expandedTaskIds, setExpandedTaskIds] = useState([]);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      const query = search.trim().toLowerCase();
      const matchesSearch =
        query.length === 0 ||
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query);
      return matchesPriority && matchesSearch;
    });
  }, [tasks, priorityFilter, search]);

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) return;

    const normalized = {
      title,
      description: form.description.trim(),
      priority: form.priority,
      estimate: Number(form.estimate) || 1,
    };

    if (editingId) {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === editingId
            ? {
                ...task,
                ...normalized,
              }
            : task
        )
      );
      resetForm();
      return;
    }

    setTasks((prev) => [
      {
        id: crypto.randomUUID(),
        status: "todo",
        createdAt: Date.now(),
        ...normalized,
      },
      ...prev,
    ]);
    setForm(EMPTY_FORM);
  }

  function deleteTask(id) {
    setTasks((prev) => prev.filter((task) => task.id !== id));
    setExpandedTaskIds((prev) => prev.filter((taskId) => taskId !== id));
    if (editingId === id) {
      resetForm();
    }
  }

  function startEdit(task) {
    setEditingId(task.id);
    setForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      estimate: task.estimate,
    });
  }

  function moveTask(taskId, nextStatus) {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, status: nextStatus } : task))
    );
  }

  function toggleDescription(taskId) {
    setExpandedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  }

  return (
    <>
      <header className="app-header">
        <h1>DayTasks</h1>
        <p>React-доска задач с drag-and-drop, приоритетом и оценкой времени</p>
      </header>

      <main className="app-layout">
        <section className="task-form-wrap">
          <h2>{editingId ? "Редактирование задачи" : "Новая задача"}</h2>

          <div className="controls">
            <div className="controls-row">
              <label>
                Поиск
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  type="text"
                  placeholder="Название или описание"
                />
              </label>
              <label>
                Фильтр приоритета
                <select
                  value={priorityFilter}
                  onChange={(event) => setPriorityFilter(event.target.value)}
                >
                  <option value="all">Все</option>
                  <option value="high">Высокий</option>
                  <option value="medium">Средний</option>
                  <option value="low">Низкий</option>
                </select>
              </label>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="task-form">
            <label>
              Название
              <input
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
                type="text"
                maxLength={120}
                required
              />
            </label>

            <label>
              Описание
              <textarea
                value={form.description}
                onChange={(event) => updateForm("description", event.target.value)}
                rows={3}
                maxLength={300}
              />
            </label>

            <div className="row">
              <label>
                Приоритет
                <select
                  value={form.priority}
                  onChange={(event) => updateForm("priority", event.target.value)}
                >
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                </select>
              </label>

              <label>
                Оценка (часы)
                <input
                  value={form.estimate}
                  onChange={(event) => updateForm("estimate", event.target.value)}
                  type="number"
                  min="0.5"
                  step="0.5"
                  required
                />
              </label>
            </div>

            <div className="task-form-actions">
              <button type="submit">{editingId ? "Сохранить" : "Добавить задачу"}</button>
              {editingId ? (
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  Отмена
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="board-wrap">
          <div className="board">
            {STATUSES.map((status) => {
              const statusTasks = visibleTasks
                .filter((task) => task.status === status.id)
                .sort((a, b) => b.createdAt - a.createdAt);
              const totalEstimate = statusTasks.reduce((sum, task) => sum + Number(task.estimate), 0);

              return (
                <section key={status.id} className="board-column">
                  <header className="column-header">
                    <div className="column-head-top">
                      <span>{status.title}</span>
                      <span>{statusTasks.length}</span>
                    </div>
                    <span className="column-summary">Суммарно: {totalEstimate} ч</span>
                  </header>

                  <div
                    className={`tasks-list ${dragOverStatus === status.id ? "drag-over" : ""}`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragOverStatus(status.id);
                    }}
                    onDragLeave={() => setDragOverStatus("")}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragOverStatus("");
                      if (draggingId) {
                        moveTask(draggingId, status.id);
                        setDraggingId(null);
                      }
                    }}
                  >
                    {statusTasks.length === 0 ? (
                      <p className="empty-col">Нет задач по текущим фильтрам</p>
                    ) : null}

                    {statusTasks.map((task) => (
                      <article
                        key={task.id}
                        className="task"
                        draggable
                        onDragStart={() => setDraggingId(task.id)}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDragOverStatus("");
                        }}
                      >
                        <header className="task-head">
                          <h3 className="task-title">{task.title}</h3>
                          <span className={`priority-badge ${task.priority}`}>
                            {PRIORITY_LABELS[task.priority]}
                          </span>
                        </header>

                        {task.description && expandedTaskIds.includes(task.id) ? (
                          <p className="task-description">{task.description}</p>
                        ) : null}

                        <footer className="task-meta">
                          <span>{task.estimate} ч</span>
                          <div className="task-actions">
                            {task.description ? (
                              <button
                                type="button"
                                className="delete-task"
                                onClick={() => toggleDescription(task.id)}
                              >
                                {expandedTaskIds.includes(task.id) ? "Скрыть" : "Подробнее"}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="delete-task"
                              onClick={() => startEdit(task)}
                            >
                              Изменить
                            </button>
                            <button
                              type="button"
                              className="delete-task"
                              onClick={() => deleteTask(task.id)}
                            >
                              Удалить
                            </button>
                          </div>
                        </footer>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
