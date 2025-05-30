// Display today's date
const date = new Date().toDateString();
document.getElementById("current-date").textContent = date;

// DARK/LIGHT MODE TOGGLE
const themeToggleBtn = document.getElementById("theme-toggle");
themeToggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("light-mode");
});

// --- Helper Functions for Local Storage ---
// Safely parse JSON from localStorage, returning an empty array if invalid
function getFromLocalStorage(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error(`Error parsing data from localStorage for key "${key}":`, e);
    return []; // Return empty array on error to prevent crashing
  }
}

// Safely save data to localStorage
function saveToLocalStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving data to localStorage for key "${key}":`, e);
  }
}

// ----- MUSCLE ZONE - PERSONAL RECORDS (PRs) -----
const prForm = document.getElementById("pr-form");
const prList = document.getElementById("pr-list");

// Load PRs securely
let prs = getFromLocalStorage("prs");

// Function to render PRs on the page
function renderPRs() {
  prList.innerHTML = ""; // Clear existing list
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

    // Edit handler for PRs (to update the PR details)
    li.querySelector(".edit-btn").addEventListener("click", () => {
      showPromptModal("Update PR Weight (kg):", pr.weight, (newWeight) => {
        const numNewWeight = Number(newWeight);
        if (!isNaN(numNewWeight) && numNewWeight >= 0) {
          showPromptModal("Update PR Date (YYYY-MM-DD, optional):", pr.date || '', (newDate) => {
            if (newDate === '' || newDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
              prs[index].weight = numNewWeight;
              prs[index].date = newDate;
              saveToLocalStorage("prs", prs);
              renderPRs();
              updateGoalProgressFromPRs();
              showInfoModal("PR updated successfully!");
            } else {
              showInfoModal("Please enter a valid date in Jamboree-MM-DD format or leave it empty.");
            }
          });
        } else {
          showInfoModal("Please enter a valid number for PR weight.");
        }
      });
    });

    // Delete handler for PRs
    li.querySelector(".delete-btn").addEventListener("click", () => {
      showConfirmationModal("Delete this Personal Record?", () => {
        prs.splice(index, 1);
        saveToLocalStorage("prs", prs);
        renderPRs();
        updateGoalProgressFromPRs();
      });
    });
    prList.appendChild(li);
  });
}

// Function to find the highest PR for a given exercise
function getHighestPRForExercise(exercise) {
  let highestWeight = 0;
  prs.forEach(pr => {
    if (pr.exercise.toLowerCase() === exercise.toLowerCase() && pr.weight > highestWeight) {
      highestWeight = pr.weight;
    }
  });
  return highestWeight;
}

// Function to update goal progress based on latest PRs
function updateGoalProgressFromPRs() {
  let goalsChanged = false;
  goals.forEach(goal => {
    const currentHighestPR = getHighestPRForExercise(goal.exercise);
    if (goal.current !== currentHighestPR) {
      goal.current = currentHighestPR;
      goalsChanged = true;
    }
  });
  if (goalsChanged) {
    saveToLocalStorage("goals", goals);
    renderGoals();
  }
}

// Function to handle adding a new PR
function addPRHandler(e) {
  e.preventDefault();
  const exercise = document.getElementById("pr-exercise").value.trim();
  const weight = document.getElementById("pr-weight").value;
  let date = document.getElementById("pr-date").value;

  if (!exercise || !weight) {
    showInfoModal("Please fill in the Exercise and Weight fields for the PR.");
    return;
  }

  if (!date) {
    date = '';
  }

  const exactDuplicate = prs.some(p =>
    p.exercise.toLowerCase() === exercise.toLowerCase() &&
    p.weight === Number(weight) &&
    p.date === date
  );

  if (exactDuplicate) {
    showInfoModal("A PR with the exact same exercise, weight, and date already exists.");
    return;
  }

  const existingBetterPR = prs.find(p =>
    p.exercise.toLowerCase() === exercise.toLowerCase() &&
    p.weight > Number(weight)
  );

  if (existingBetterPR) {
    showConfirmationModal(`You already have a PR for "${exercise}" of ${existingBetterPR.weight}kg. Do you still want to add this ${weight}kg PR?`, () => {
      prs.push({ exercise, weight: Number(weight), date });
      saveToLocalStorage("prs", prs);
      renderPRs();
      updateGoalProgressFromPRs();
      prForm.reset();
      showInfoModal("New PR entry added.");
    }, () => {
      showInfoModal("PR not added.");
      prForm.reset();
    });
  } else {
    prs.push({ exercise, weight: Number(weight), date });
    saveToLocalStorage("prs", prs);
    renderPRs();
    updateGoalProgressFromPRs();
    prForm.reset();
    showInfoModal("New PR added successfully!");
  }
}

prForm.addEventListener("submit", addPRHandler);
renderPRs();


// ----- MUSCLE ZONE - FITNESS GOALS -----
const goalForm = document.getElementById("goal-form");
const goalList = document.getElementById("goal-list");
const goalNameInput = document.getElementById("goal-name");
const goalExerciseInput = document.getElementById("goal-exercise");
const goalTargetInput = document.getElementById("goal-target");
const goalDueDateInput = document.getElementById("goal-due-date");

let goals = getFromLocalStorage("goals");

function calculateProgress(current, target) {
  if (target <= 0) return 0;
  return Math.min(100, (current / target) * 100);
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
        <span class="edit-btn" title="Edit Goal Details">✏️</span>
        <span class="delete-btn" title="Delete Goal">❌</span>
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
      goalForm.addEventListener("submit", updateGoalDetailsHandler);
    });

    li.querySelector(".delete-btn").addEventListener("click", () => {
      showConfirmationModal("Delete this goal?", () => {
        goals.splice(index, 1);
        saveToLocalStorage("goals", goals);
        renderGoals();
      });
    });
    goalList.appendChild(li);
  });
}

function updateGoalDetailsHandler(e) {
  e.preventDefault();
  const index = parseInt(goalForm.dataset.editingIndex);
  const name = goalNameInput.value.trim();
  const exercise = goalExerciseInput.value.trim();
  const target = Number(goalTargetInput.value);
  const dueDate = goalDueDateInput.value;

  if (!name || !exercise || !target || !dueDate) {
    showInfoModal("Please fill in all Goal fields.");
    return;
  }

  goals[index].name = name;
  goals[index].exercise = exercise;
  goals[index].target = target;
  goals[index].dueDate = dueDate;
  goals[index].current = getHighestPRForExercise(exercise);

  saveToLocalStorage("goals", goals);
  renderGoals();
  goalForm.reset();
  goalForm.querySelector("button[type=submit]").textContent = "Set Goal";

  goalForm.removeEventListener("submit", updateGoalDetailsHandler);
  goalForm.addEventListener("submit", addGoalHandler);
  delete goalForm.dataset.editingIndex;
  showInfoModal("Goal details updated successfully!");
}

function addGoalHandler(e) {
  e.preventDefault();
  const name = goalNameInput.value.trim();
  const exercise = goalExerciseInput.value.trim();
  const target = Number(goalTargetInput.value);
  const dueDate = goalDueDateInput.value;

  if (!name || !exercise || !target || !dueDate) {
    showInfoModal("Please fill in all Goal fields.");
    return;
  }

  const initialCurrent = getHighestPRForExercise(exercise);

  goals.push({ name, exercise, target, current: initialCurrent, dueDate });
  saveToLocalStorage("goals", goals);
  renderGoals();
  goalForm.reset();
  showInfoModal("New goal set successfully!");
}

goalForm.addEventListener("submit", addGoalHandler);
renderGoals();


// ----- MIND ZONE - TOPIC TRACKER (Refactored) -----
const studyForm = document.getElementById("study-form");
const studyList = document.getElementById("study-list");
const topicNameInput = document.getElementById("topic-name"); // Renamed ID
const studySubjectInput = document.getElementById("study-subject"); // Renamed ID
const studyPriorityInput = document.getElementById("study-priority");

const studyFilterSubject = document.getElementById("study-filter-subject"); // Renamed ID
const studyFilterPriority = document.getElementById("study-filter-priority");
const studyFilterCompletion = document.getElementById("study-filter-completion"); // New filter

let studyTopics = getFromLocalStorage("studyTopics"); // Renamed array

function saveStudyTopics() {
  saveToLocalStorage("studyTopics", studyTopics);
}

function renderStudyTopics(filterSubj = "All", filterPrio = "All", filterComp = "All") {
  studyList.innerHTML = "";

  let filtered = studyTopics;

  if (filterSubj !== "All") {
    filtered = filtered.filter(t => t.subject === filterSubj);
  }
  if (filterPrio !== "All") {
    filtered = filtered.filter(t => t.priority === filterPrio);
  }
  if (filterComp !== "All") {
    if (filterComp === "Completed") {
      filtered = filtered.filter(t => t.isCompleted);
    } else if (filterComp === "Pending") {
      filtered = filtered.filter(t => !t.isCompleted);
    }
  }

  filtered.forEach((topic, index) => {
    const li = document.createElement("li");
    li.classList.toggle("completed", topic.isCompleted); // Apply 'completed' class

    const completionDateDisplay = topic.dateCompleted ? ` (Completed: ${topic.dateCompleted})` : '';

    li.innerHTML = `
      <div>
        <input type="checkbox" class="topic-completed-checkbox" ${topic.isCompleted ? 'checked' : ''}>
        <strong>${topic.topicName}</strong> (${topic.subject}) - Priority: ${topic.priority}<br>
        <small>Added: ${topic.dateAdded}${completionDateDisplay}</small>
      </div>
      <div>
        <span class="edit-btn" title="Edit Topic">✏️</span>
        <span class="delete-btn" title="Delete Topic">❌</span>
      </div>
    `;

    // Event listener for completion checkbox
    li.querySelector(".topic-completed-checkbox").addEventListener("change", (e) => {
      topic.isCompleted = e.target.checked;
      topic.dateCompleted = topic.isCompleted ? new Date().toISOString().split('T')[0] : null;
      saveStudyTopics();
      renderStudyTopics(studyFilterSubject.value, studyFilterPriority.value, studyFilterCompletion.value);
      updateStudyStats();
      showInfoModal(`Topic "${topic.topicName}" marked as ${topic.isCompleted ? 'completed' : 'pending'}.`);
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
      showConfirmationModal("Delete this study topic?", () => {
        studyTopics.splice(index, 1);
        saveStudyTopics();
        renderStudyTopics(studyFilterSubject.value, studyFilterPriority.value, studyFilterCompletion.value);
        updateStudyStats();
      });
    });

    studyList.appendChild(li);
  });

  updateStudyStats(filtered);
}

function updateStudyStats(filteredList = studyTopics) {
  const totalTopics = filteredList.length;
  const completedTopics = filteredList.filter(t => t.isCompleted).length;
  const pendingTopics = totalTopics - completedTopics;
  const highPriority = filteredList.filter(t => t.priority === "High" && !t.isCompleted).length;
  const mediumPriority = filteredList.filter(t => t.priority === "Medium" && !t.isCompleted).length;
  const lowPriority = filteredList.filter(t => t.priority === "Low" && !t.isCompleted).length;

  studyStats.innerHTML = `
    Topics: ${totalTopics} | Completed: ${completedTopics} | Pending: ${pendingTopics}<br>
    Pending by Priority: High: ${highPriority} | Medium: ${mediumPriority} | Low: ${lowPriority}
  `;
}

function updateStudyTopicHandler(e) {
  e.preventDefault();
  const index = parseInt(studyForm.dataset.editingIndex);
  const topicName = topicNameInput.value.trim();
  const subject = studySubjectInput.value;
  const priority = studyPriorityInput.value;

  if (!topicName || !subject || !priority) {
    showInfoModal("Please fill in all Topic fields.");
    return;
  }

  // Preserve isCompleted and dateAdded/Completed if already set
  studyTopics[index].topicName = topicName;
  studyTopics[index].subject = subject;
  studyTopics[index].priority = priority;
  // If subject changes, and it's completed, keep the completion status, otherwise re-evaluate based on new subject if needed
  // For simplicity, we just update the properties. Completion status is handled by checkbox.

  saveStudyTopics();
  renderStudyTopics(studyFilterSubject.value, studyFilterPriority.value, studyFilterCompletion.value);
  updateStudyStats();
  studyForm.reset();
  studyForm.querySelector("button[type=submit]").textContent = "Add Topic";

  studyForm.removeEventListener("submit", updateStudyTopicHandler);
  studyForm.addEventListener("submit", addStudyTopicHandler);
  delete studyForm.dataset.editingIndex;
  showInfoModal("Study topic updated successfully!");
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

  const dateAdded = new Date().toISOString().split('T')[0]; // Current date for 'added'

  studyTopics.push({
    topicName,
    subject,
    priority,
    dateAdded,
    dateCompleted: null, // Initially not completed
    isCompleted: false // Initially not completed
  });
  saveStudyTopics();
  renderStudyTopics(studyFilterSubject.value, studyFilterPriority.value, studyFilterCompletion.value);
  updateStudyStats();
  studyForm.reset();
  showInfoModal("New study topic added successfully!");
}

studyForm.addEventListener("submit", addStudyTopicHandler);

// Filter event listeners
studyFilterSubject.addEventListener("change", () => {
  renderStudyTopics(studyFilterSubject.value, studyFilterPriority.value, studyFilterCompletion.value);
});
studyFilterPriority.addEventListener("change", () => {
  renderStudyTopics(studyFilterSubject.value, studyFilterPriority.value, studyFilterCompletion.value);
});
studyFilterCompletion.addEventListener("change", () => {
  renderStudyTopics(studyFilterSubject.value, studyFilterPriority.value, studyFilterCompletion.value);
});

// Initial render
renderStudyTopics();
updateStudyStats();

// ----- Custom Modal Functions (Unchanged) -----

function showConfirmationModal(message, onConfirm, onCancel = () => {}) {
  const modalHtml = `
    <div id="custom-modal" class="modal-overlay">
      <div class="modal-content">
        <p>${message}</p>
        <div class="modal-buttons">
          <button id="modal-confirm-btn">Confirm</button>
          <button id="modal-cancel-btn">Cancel</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modal = document.getElementById('custom-modal');
  const confirmBtn = document.getElementById('modal-confirm-btn');
  const cancelBtn = document.getElementById('modal-cancel-btn');

  confirmBtn.onclick = () => {
    onConfirm();
    modal.remove();
  };
  cancelBtn.onclick = () => {
    onCancel();
    modal.remove();
  };
}

function showInfoModal(message) {
  const modalHtml = `
    <div id="custom-modal" class="modal-overlay">
      <div class="modal-content">
        <p>${message}</p>
        <div class="modal-buttons">
          <button id="modal-ok-btn">OK</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modal = document.getElementById('custom-modal');
  const okBtn = document.getElementById('modal-ok-btn');

  okBtn.onclick = () => {
    modal.remove();
  };
}

function showPromptModal(message, defaultValue, onInput) {
  const modalHtml = `
    <div id="custom-modal" class="modal-overlay">
      <div class="modal-content">
        <p>${message}</p>
        <input type="text" id="modal-input" value="${defaultValue || ''}" />
        <div class="modal-buttons">
          <button id="modal-submit-btn">Submit</button>
          <button id="modal-cancel-btn">Cancel</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modal = document.getElementById('custom-modal');
  const inputField = document.getElementById('modal-input');
  const submitBtn = document.getElementById('modal-submit-btn');
  const cancelBtn = document.getElementById('modal-cancel-btn');

  submitBtn.onclick = () => {
    onInput(inputField.value);
    modal.remove();
  };
  cancelBtn.onclick = () => { 
    modal.remove();
  };
  inputField.focus();
}







 


