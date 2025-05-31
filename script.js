// Display today's date
const date = new Date().toDateString();
document.getElementById("current-date").textContent = date;

// Toggle dark/light mode
const themeToggleBtn = document.getElementById("theme-toggle");
themeToggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("light-mode");
});

// ========== LOCAL STORAGE HELPERS ==========
function getFromLocalStorage(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error(`Error parsing data from localStorage for key "${key}":`, e);
    return [];
  }
}

function saveToLocalStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving data to localStorage for key "${key}":`, e);
  }
}

// ========== DASHBOARD ==========

const dashboard = document.createElement("div");
dashboard.className = "dashboard";
dashboard.innerHTML = `
  <div class="dashboard-box" id="dash-prs">
    <h4>Personal Records</h4>
    <p>0</p>
  </div>
  <div class="dashboard-box" id="dash-goals">
    <h4>Fitness Goals</h4>
    <p>0</p>
  </div>
  <div class="dashboard-box" id="dash-topics">
    <h4>Study Topics</h4>
    <p>0</p>
  </div>
`;
document.querySelector(".container").insertBefore(dashboard, document.querySelector(".panel"));

function updateDashboard() {
  document.querySelector("#dash-prs p").textContent = prs.length;
  document.querySelector("#dash-goals p").textContent = goals.length;
  const total = studyTopics.length;
  const completed = studyTopics.filter(t => t.isCompleted).length;
  document.querySelector("#dash-topics p").textContent = `${completed}/${total}`;
}

// ========== MUSCLE ZONE - PRs ==========
const prForm = document.getElementById("pr-form");
const prList = document.getElementById("pr-list");
let prs = getFromLocalStorage("prs");

function renderPRs() {
  prList.innerHTML = "";
  prs.forEach((pr, index) => {
    const li = document.createElement("li");
    const prDateDisplay = pr.date ? ` on ${pr.date}` : '';
    li.innerHTML = `
      <div>
        <strong>${pr.exercise}</strong> - ${pr.weight} kg${prDateDisplay}
      </div>
      <div>
        <span class="edit-btn" title="Edit PR">✏️</span>
        <span class="delete-btn" title="Delete PR">❌</span>
      </div>
    `;

    li.querySelector(".edit-btn").addEventListener("click", () => {
      showPromptModal("Update PR Weight (kg):", pr.weight, (newWeight) => {
        const numNewWeight = Number(newWeight);
        if (!isNaN(numNewWeight) && numNewWeight >= 0) {
          showPromptModal("Update PR Date (YYYY-MM-DD, optional):", pr.date || '', (newDate) => {
            if (newDate === '' || /^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
              prs[index].weight = numNewWeight;
              prs[index].date = newDate;
              saveToLocalStorage("prs", prs);
              renderPRs();
              updateGoalProgressFromPRs();
              updateDashboard();
              showInfoModal("PR updated successfully!");
            } else {
              showInfoModal("Please enter a valid date.");
            }
          });
        } else {
          showInfoModal("Invalid weight.");
        }
      });
    });

    li.querySelector(".delete-btn").addEventListener("click", () => {
      showConfirmationModal("Delete this PR?", () => {
        prs.splice(index, 1);
        saveToLocalStorage("prs", prs);
        renderPRs();
        updateGoalProgressFromPRs();
        updateDashboard();
      });
    });

    prList.appendChild(li);
  });
}

function getHighestPRForExercise(exercise) {
  let highest = 0;
  prs.forEach(pr => {
    if (pr.exercise.toLowerCase() === exercise.toLowerCase() && pr.weight > highest) {
      highest = pr.weight;
    }
  });
  return highest;
}

function updateGoalProgressFromPRs() {
  let changed = false;
  goals.forEach(goal => {
    const current = getHighestPRForExercise(goal.exercise);
    if (goal.current !== current) {
      goal.current = current;
      changed = true;
    }
  });
  if (changed) {
    saveToLocalStorage("goals", goals);
    renderGoals();
  }
}

function addPRHandler(e) {
  e.preventDefault();
  const exercise = document.getElementById("pr-exercise").value.trim();
  const weight = parseFloat(document.getElementById("pr-weight").value);
  let date = document.getElementById("pr-date").value;

  if (!exercise || isNaN(weight)) {
    showInfoModal("Please fill in valid exercise and weight.");
    return;
  }

  if (!date) date = '';

  const exactDuplicate = prs.some(p =>
    p.exercise.toLowerCase() === exercise.toLowerCase() &&
    p.weight === weight &&
    p.date === date
  );

  if (exactDuplicate) {
    showInfoModal("This PR already exists.");
    return;
  }

  const existingBetterPR = prs.find(p =>
    p.exercise.toLowerCase() === exercise.toLowerCase() &&
    p.weight > weight
  );

  const addPR = () => {
    prs.push({ exercise, weight, date });
    saveToLocalStorage("prs", prs);
    renderPRs();
    updateGoalProgressFromPRs();
    updateDashboard();
    prForm.reset();
    showInfoModal("PR added!");
  };

  if (existingBetterPR) {
    showConfirmationModal(`You already have a higher PR (${existingBetterPR.weight}kg). Still add ${weight}kg?`, addPR);
  } else {
    addPR();
  }
}

prForm.addEventListener("submit", addPRHandler);
renderPRs();

// ========== MUSCLE ZONE - GOALS ==========
const goalForm = document.getElementById("goal-form");
const goalList = document.getElementById("goal-list");
const goalNameInput = document.getElementById("goal-name");
const goalExerciseInput = document.getElementById("goal-exercise");
const goalTargetInput = document.getElementById("goal-target");
const goalDueDateInput = document.getElementById("goal-due-date");

let goals = getFromLocalStorage("goals");

function calculateProgress(current, target) {
  return target <= 0 ? 0 : Math.min(100, (current / target) * 100);
}

function renderGoals() {
  goalList.innerHTML = "";
  goals.forEach((goal, index) => {
    const progress = calculateProgress(goal.current, goal.target);
    const li = document.createElement("li");
    li.innerHTML = `
      <div>
        <strong>${goal.name}</strong> (Exercise: ${goal.exercise})<br>
        Target: ${goal.target} kg by ${goal.dueDate}<br>
        Current Best PR: ${goal.current} kg
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: ${progress}%"></div>
          <span class="progress-text">${progress.toFixed(0)}%</span>
        </div>
      </div>
      <div>
        <span class="edit-btn">✏️</span>
        <span class="delete-btn">❌</span>
      </div>
    `;

    li.querySelector(".edit-btn").addEventListener("click", () => {
      goalNameInput.value = goal.name;
      goalExerciseInput.value = goal.exercise;
      goalTargetInput.value = goal.target;
      goalDueDateInput.value = goal.dueDate;

      goalForm.querySelector("button[type=submit]").textContent = "Update Goal";
      goalForm.dataset.editingIndex = index;

      goalForm.removeEventListener("submit", addGoalHandler);
      goalForm.addEventListener("submit", updateGoalHandler);
    });

    li.querySelector(".delete-btn").addEventListener("click", () => {
      showConfirmationModal("Delete this goal?", () => {
        goals.splice(index, 1);
        saveToLocalStorage("goals", goals);
        renderGoals();
        updateDashboard();
      });
    });

    goalList.appendChild(li);
  });
}

function updateGoalHandler(e) {
  e.preventDefault();
  const index = parseInt(goalForm.dataset.editingIndex);
  const name = goalNameInput.value.trim();
  const exercise = goalExerciseInput.value.trim();
  const target = parseFloat(goalTargetInput.value);
  const dueDate = goalDueDateInput.value;

  if (!name || !exercise || isNaN(target) || !dueDate) {
    showInfoModal("Please fill all fields.");
    return;
  }

  goals[index] = {
    name,
    exercise,
    target,
    current: getHighestPRForExercise(exercise),
    dueDate
  };

  saveToLocalStorage("goals", goals);
  renderGoals();
  updateDashboard();
  goalForm.reset();
  goalForm.querySelector("button[type=submit]").textContent = "Set Goal";
  goalForm.removeEventListener("submit", updateGoalHandler);
  goalForm.addEventListener("submit", addGoalHandler);
  delete goalForm.dataset.editingIndex;
  showInfoModal("Goal updated!");
}

function addGoalHandler(e) {
  e.preventDefault();
  const name = goalNameInput.value.trim();
  const exercise = goalExerciseInput.value.trim();
  const target = parseFloat(goalTargetInput.value);
  const dueDate = goalDueDateInput.value;

  if (!name || !exercise || isNaN(target) || !dueDate) {
    showInfoModal("Please fill all fields.");
    return;
  }

  goals.push({
    name,
    exercise,
    target,
    current: getHighestPRForExercise(exercise),
    dueDate
  });

  saveToLocalStorage("goals", goals);
  renderGoals();
  updateDashboard();
  goalForm.reset();
  showInfoModal("Goal added!");
}

goalForm.addEventListener("submit", addGoalHandler);
renderGoals();

// ========== MIND ZONE - STUDY ==========
const studyForm = document.getElementById("study-form");
const studyList = document.getElementById("study-list");
const topicNameInput = document.getElementById("topic-name");
const studySubjectInput = document.getElementById("study-subject");
const studyPriorityInput = document.getElementById("study-priority");
const studyFilterSubject = document.getElementById("study-filter-subject");
const studyFilterPriority = document.getElementById("study-filter-priority");
const studyFilterCompletion = document.getElementById("study-filter-completion");

let studyTopics = getFromLocalStorage("studyTopics");

function saveStudyTopics() {
  saveToLocalStorage("studyTopics", studyTopics);
}

function renderStudyTopics() {
  studyList.innerHTML = "";
  const subj = studyFilterSubject.value;
  const prio = studyFilterPriority.value;
  const comp = studyFilterCompletion.value;

  let filtered = studyTopics;
  if (subj !== "All") filtered = filtered.filter(t => t.subject === subj);
  if (prio !== "All") filtered = filtered.filter(t => t.priority === prio);
  if (comp !== "All") {
    filtered = filtered.filter(t => comp === "Completed" ? t.isCompleted : !t.isCompleted);
  }

  filtered.forEach((topic, index) => {
    const li = document.createElement("li");
    li.classList.toggle("completed", topic.isCompleted);
    const completeDate = topic.dateCompleted ? ` (Completed: ${topic.dateCompleted})` : '';

    li.innerHTML = `
      <div>
        <input type="checkbox" class="topic-completed-checkbox" ${topic.isCompleted ? 'checked' : ''}>
        <strong>${topic.topicName}</strong> (${topic.subject}) - Priority: ${topic.priority}<br>
        <small>Added: ${topic.dateAdded}${completeDate}</small>
      </div>
      <div>
        <span class="edit-btn">✏️</span>
        <span class="delete-btn">❌</span>
      </div>
    `;

    li.querySelector(".topic-completed-checkbox").addEventListener("change", (e) => {
      topic.isCompleted = e.target.checked;
      topic.dateCompleted = topic.isCompleted ? new Date().toISOString().split('T')[0] : null;
      saveStudyTopics();
      renderStudyTopics();
      updateStudyStats();
      updateDashboard();
    });

    li.querySelector(".edit-btn").addEventListener("click", () => {
      topicNameInput.value = topic.topicName;
      studySubjectInput.value = topic.subject;
      studyPriorityInput.value = topic.priority;

      studyForm.querySelector("button[type=submit]").textContent = "Update Topic";
      studyForm.dataset.editingIndex = index;

      studyForm.removeEventListener("submit", addStudyTopicHandler);
      studyForm.addEventListener("submit", updateStudyTopicHandler);
    });

    li.querySelector(".delete-btn").addEventListener("click", () => {
      showConfirmationModal("Delete this topic?", () => {
        studyTopics.splice(index, 1);
        saveStudyTopics();
        renderStudyTopics();
        updateStudyStats();
        updateDashboard();
      });
    });

    studyList.appendChild(li);
  });

  updateDashboard();
}

function updateStudyStats() {
  const total = studyTopics.length;
  const completed = studyTopics.filter(t => t.isCompleted).length;
  const pending = total - completed;
  const high = studyTopics.filter(t => t.priority === "High" && !t.isCompleted).length;
  const medium = studyTopics.filter(t => t.priority === "Medium" && !t.isCompleted).length;
  const low = studyTopics.filter(t => t.priority === "Low" && !t.isCompleted).length;

  document.getElementById("study-stats").innerHTML = `
    Topics: ${total} | Completed: ${completed} | Pending: ${pending}<br>
    Pending by Priority: High: ${high} | Medium: ${medium} | Low: ${low}
  `;
}

function addStudyTopicHandler(e) {
  e.preventDefault();
  const topicName = topicNameInput.value.trim();
  const subject = studySubjectInput.value;
  const priority = studyPriorityInput.value;

  if (!topicName || !subject || !priority) {
    showInfoModal("Please fill in all Topic fields.");
    return;
  }

  const dateAdded = new Date().toISOString().split('T')[0];
  studyTopics.push({
    topicName,
    subject,
    priority,
    dateAdded,
    dateCompleted: null,
    isCompleted: false
  });

  saveStudyTopics();
  renderStudyTopics();
  updateStudyStats();
  studyForm.reset();
  showInfoModal("Topic added!");
}

function updateStudyTopicHandler(e) {
  e.preventDefault();
  const index = parseInt(studyForm.dataset.editingIndex);
  studyTopics[index].topicName = topicNameInput.value.trim();
  studyTopics[index].subject = studySubjectInput.value;
  studyTopics[index].priority = studyPriorityInput.value;

  saveStudyTopics();
  renderStudyTopics();
  updateStudyStats();
  studyForm.reset();
  studyForm.querySelector("button[type=submit]").textContent = "Add Topic";
  studyForm.removeEventListener("submit", updateStudyTopicHandler);
  studyForm.addEventListener("submit", addStudyTopicHandler);
  delete studyForm.dataset.editingIndex;
  showInfoModal("Topic updated!");
}

studyForm.addEventListener("submit", addStudyTopicHandler);
studyFilterSubject.addEventListener("change", renderStudyTopics);
studyFilterPriority.addEventListener("change", renderStudyTopics);
studyFilterCompletion.addEventListener("change", renderStudyTopics);
renderStudyTopics();
updateStudyStats();

// ========== MODALS ==========
function showConfirmationModal(message, onConfirm, onCancel = () => {}) {
  const html = `
    <div id="custom-modal" class="modal-overlay">
      <div class="modal-content">
        <p>${message}</p>
        <div class="modal-buttons">
          <button id="modal-confirm-btn">Confirm</button>
          <button id="modal-cancel-btn">Cancel</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML("beforeend", html);
  const modal = document.getElementById("custom-modal");
  modal.querySelector("#modal-confirm-btn").onclick = () => {
    onConfirm();
    modal.remove();
  };
  modal.querySelector("#modal-cancel-btn").onclick = () => {
    onCancel();
    modal.remove();
  };
}

function showInfoModal(message) {
  const html = `
    <div id="custom-modal" class="modal-overlay">
      <div class="modal-content">
        <p>${message}</p>
        <div class="modal-buttons">
          <button id="modal-ok-btn">OK</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML("beforeend", html);
  document.getElementById("modal-ok-btn").onclick = () => {
    document.getElementById("custom-modal").remove();
  };
}

function showPromptModal(message, defaultValue, onInput) {
  const html = `
    <div id="custom-modal" class="modal-overlay">
      <div class="modal-content">
        <p>${message}</p>
        <input type="text" id="modal-input" value="${defaultValue || ''}" />
        <div class="modal-buttons">
          <button id="modal-submit-btn">Submit</button>
          <button id="modal-cancel-btn">Cancel</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML("beforeend", html);
  const modal = document.getElementById("custom-modal");
  modal.querySelector("#modal-submit-btn").onclick = () => {
    onInput(modal.querySelector("#modal-input").value);
    modal.remove();
  };
  modal.querySelector("#modal-cancel-btn").onclick = () => modal.remove();
  modal.querySelector("#modal-input").focus();
}







 


