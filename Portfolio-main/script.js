const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
const canRevealOnScroll = "IntersectionObserver" in window && !prefersReducedMotion;
const hero = document.querySelector(".hero");
const networkCanvas = document.querySelector(".network-canvas");
const motionButton = document.querySelector(".motion-toggle");
const motionLabel = motionButton.querySelector(".motion-toggle-label");
const motionIcon = motionButton.querySelector(".motion-toggle-icon");
const vibeButton = document.querySelector(".vibe-toggle");
const vibeLabel = vibeButton.querySelector(".vibe-toggle-label");
const themeButton = document.querySelector(".theme-toggle");
const themeLabel = themeButton.querySelector(".theme-toggle-label");
const themeIcon = themeButton.querySelector(".theme-toggle-icon");
const progressFill = document.querySelector("#reading-progress-fill");
let motionEnabled = !prefersReducedMotion;
let isCoralPalette = false;

function updateMotionControl() {
    motionButton.setAttribute("aria-pressed", String(motionEnabled));
    motionButton.setAttribute(
        "aria-label",
        motionEnabled ? "Pause ambient animation" : "Play ambient animation"
    );
    motionLabel.textContent = motionEnabled ? "Pause animation" : "Play animation";
    motionIcon.textContent = motionEnabled ? "Ⅱ" : "▶";
    document.documentElement.classList.toggle("motion-paused", !motionEnabled);
}

updateMotionControl();

function updateThemeControl() {
    const isDark = document.documentElement.dataset.theme === "dark";
    themeButton.setAttribute("aria-pressed", String(isDark));
    themeButton.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} theme`);
    themeLabel.textContent = isDark ? "Light theme" : "Dark theme";
    themeIcon.textContent = isDark ? "☼" : "☾";
    document.querySelector('meta[name="theme-color"]').content = isDark ? "#17131d" : "#f8f6f2";
}

updateThemeControl();

themeButton.addEventListener("click", () => {
    document.documentElement.dataset.theme =
        document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    updateThemeControl();
});

const networkContext = networkCanvas.getContext("2d");
let networkColors = ["100, 84, 255", "255, 105, 88", "27, 172, 143", "245, 174, 75"];
const networkPointer = { x: -1000, y: -1000 };
let networkNodes = [];
let networkWidth = 0;
let networkHeight = 0;
let networkFrame = 0;
let lastNetworkFrame = 0;
let heroIsVisible = true;

function resizeNetwork() {
    const bounds = hero.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    networkWidth = bounds.width;
    networkHeight = bounds.height;
    networkCanvas.width = Math.round(networkWidth * pixelRatio);
    networkCanvas.height = Math.round(networkHeight * pixelRatio);
    networkCanvas.style.width = `${networkWidth}px`;
    networkCanvas.style.height = `${networkHeight}px`;
    networkContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const nodeCount = Math.min(82, Math.max(34, Math.round((networkWidth * networkHeight) / 10500)));
    networkNodes = Array.from({ length: nodeCount }, () => ({
        x: Math.random() * networkWidth,
        y: Math.random() * networkHeight,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        radius: 1.1 + Math.random() * 1.4,
        color: networkColors[Math.floor(Math.random() * networkColors.length)]
    }));

    drawNetwork();
    if (motionEnabled && heroIsVisible && !document.hidden) {
        startNetwork();
    }
}

function drawNetwork(timestamp = performance.now()) {
    if (!networkContext) {
        return;
    }

    networkContext.clearRect(0, 0, networkWidth, networkHeight);
    const connectionDistance = Math.min(190, Math.max(115, networkWidth * 0.18));

    for (let index = 0; index < networkNodes.length; index += 1) {
        const node = networkNodes[index];

        if (motionEnabled) {
            const pointerX = networkPointer.x - node.x;
            const pointerY = networkPointer.y - node.y;
            const pointerDistance = Math.hypot(pointerX, pointerY);

            if (pointerDistance < 150 && pointerDistance > 0) {
                const influence = (150 - pointerDistance) / 15000;
                node.vx += pointerX * influence;
                node.vy += pointerY * influence;
            }

            node.vx *= 0.985;
            node.vy *= 0.985;
            node.x += node.vx;
            node.y += node.vy;

            if (node.x < 0 || node.x > networkWidth) {
                node.vx *= -1;
                node.x = Math.max(0, Math.min(networkWidth, node.x));
            }

            if (node.y < 0 || node.y > networkHeight) {
                node.vy *= -1;
                node.y = Math.max(0, Math.min(networkHeight, node.y));
            }
        }

        for (let otherIndex = index + 1; otherIndex < networkNodes.length; otherIndex += 1) {
            const other = networkNodes[otherIndex];
            const distance = Math.hypot(node.x - other.x, node.y - other.y);

            if (distance < connectionDistance) {
                const opacity = (1 - distance / connectionDistance) * 0.2;
                networkContext.beginPath();
                networkContext.moveTo(node.x, node.y);
                networkContext.lineTo(other.x, other.y);
                networkContext.strokeStyle = `rgba(81, 77, 118, ${opacity * 1.4})`;
                networkContext.lineWidth = 0.75;
                networkContext.stroke();

                if ((index * 17 + otherIndex * 13) % 23 === 0) {
                    const phase = ((timestamp / 2600) + (index * 0.17) + (otherIndex * 0.11)) % 1;
                    const packetX = node.x + (other.x - node.x) * phase;
                    const packetY = node.y + (other.y - node.y) * phase;
                    const packetColor = networkColors[(index + otherIndex) % networkColors.length];

                    networkContext.beginPath();
                    networkContext.arc(packetX, packetY, 2.2, 0, Math.PI * 2);
                    networkContext.fillStyle = `rgba(${packetColor}, 0.9)`;
                    networkContext.fill();
                }
            }
        }

        networkContext.beginPath();
        const pulse = motionEnabled ? Math.sin(timestamp / 900 + index) * 0.45 : 0;
        networkContext.arc(node.x, node.y, node.radius + pulse, 0, Math.PI * 2);
        networkContext.fillStyle = `rgba(${node.color}, ${0.48 + (pulse + 0.45) * 0.18})`;
        networkContext.fill();
    }

    if (networkPointer.x >= 0 && networkPointer.x <= networkWidth) {
        const glow = networkContext.createRadialGradient(
            networkPointer.x,
            networkPointer.y,
            0,
            networkPointer.x,
            networkPointer.y,
            150
        );
        glow.addColorStop(0, "rgba(100, 84, 255, 0.1)");
        glow.addColorStop(1, "rgba(100, 84, 255, 0)");
        networkContext.fillStyle = glow;
        networkContext.fillRect(0, 0, networkWidth, networkHeight);
    }
}

function animateNetwork(timestamp) {
    if (!motionEnabled || !heroIsVisible || document.hidden) {
        networkFrame = 0;
        return;
    }

    if (timestamp - lastNetworkFrame >= 1000 / 30) {
        drawNetwork(timestamp);
        lastNetworkFrame = timestamp;
    }

    networkFrame = window.requestAnimationFrame(animateNetwork);
}

function startNetwork() {
    if (!networkFrame && motionEnabled && heroIsVisible && !document.hidden) {
        networkFrame = window.requestAnimationFrame(animateNetwork);
    }
}

function stopNetwork() {
    if (networkFrame) {
        window.cancelAnimationFrame(networkFrame);
        networkFrame = 0;
    }
}

const networkResizeObserver = new ResizeObserver(resizeNetwork);
networkResizeObserver.observe(hero);

hero.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") {
        return;
    }

    const bounds = hero.getBoundingClientRect();
    networkPointer.x = event.clientX - bounds.left;
    networkPointer.y = event.clientY - bounds.top;
});

hero.addEventListener("pointerleave", () => {
    networkPointer.x = -1000;
    networkPointer.y = -1000;
});

const heroVisibilityObserver = new IntersectionObserver(([entry]) => {
    heroIsVisible = entry.isIntersecting;

    if (heroIsVisible) {
        startNetwork();
    } else {
        stopNetwork();
    }
}, { threshold: 0 });

heroVisibilityObserver.observe(hero);

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        stopNetwork();
    } else {
        startNetwork();
    }
});

motionButton.addEventListener("click", () => {
    motionEnabled = !motionEnabled;
    updateMotionControl();

    if (motionEnabled) {
        drawNetwork();
        startNetwork();
    } else {
        stopNetwork();
        drawNetwork();
    }
});

vibeButton.addEventListener("click", () => {
    isCoralPalette = !isCoralPalette;
    document.documentElement.dataset.vibe = isCoralPalette ? "coral" : "violet";
    vibeButton.setAttribute("aria-pressed", String(isCoralPalette));
    vibeButton.setAttribute(
        "aria-label",
        isCoralPalette ? "Switch to the violet and blue color palette" : "Switch to the plum and coral color palette"
    );
    vibeLabel.textContent = isCoralPalette ? "Try violet + blue" : "Try plum + coral";
    networkColors = isCoralPalette
        ? ["255, 105, 88", "100, 84, 255", "68, 129, 245", "245, 174, 75"]
        : ["100, 84, 255", "255, 105, 88", "27, 172, 143", "245, 174, 75"];
    drawNetwork();
});

const terminal = document.querySelector(".portfolio-terminal");
const terminalForm = document.querySelector("#terminal-form");
const terminalInput = document.querySelector("#terminal-input");
const terminalLog = document.querySelector("#terminal-log");
const terminalCommands = {
    help: {
        message: "Try: about, projects, skills, github, leetcode, experience, achievements, contact, resume, or clear."
    },
    about: {
        message: "Swati Pandey — Software Development Engineer I focused on Java backend systems. Jumping to the about section.",
        target: "about"
    },
    whoami: {
        message: "Swati Pandey — Software Development Engineer I at Flipkart, focused on Java backend systems."
    },
    github: {
        message: "Opening public repositories and account metadata from GitHub.",
        target: "github-profile"
    },
    leetcode: {
        message: "Opening the LeetCode profile card and link.",
        target: "leetcode-profile"
    },
    experience: {
        message: "Career timeline: Flipkart (current) and Techasoft. Jumping to experience.",
        target: "experience"
    },
    projects: {
        message: "Backend case studies, booking workflows, APIs, and the engineering behind them. Let's go.",
        target: "projects"
    },
    skills: {
        message: "Java, Spring Boot, Spring MVC, APIs, Kafka, MySQL, AWS, Docker, Kubernetes, and more. Opening the toolkit.",
        target: "skills"
    },
    achievements: {
        message: "DSA practice, hackathon teamwork, and community work. Jumping to the highlights.",
        target: "achievements"
    },
    contact: {
        message: "Want to talk backend engineering? Jumping to contact.",
        target: "contact"
    },
    resume: {
        message: "Opening the resume download.",
        href: "https://drive.google.com/file/d/19sbMx_JOtd2BUkVYvgIFvIQAPwP4I-u8/view?usp=sharing",
        linkLabel: "Download resume"
    }
};

function appendTerminalEntry(command, result, action) {
    const entry = document.createElement("div");
    entry.className = "terminal-entry";

    const commandLine = document.createElement("span");
    commandLine.className = "terminal-entry-command";
    commandLine.textContent = `swati ➜ ${command}`;

    const resultLine = document.createElement("span");
    resultLine.className = "terminal-entry-result";
    resultLine.textContent = result;

    entry.append(commandLine, resultLine);

    if (action?.href) {
        const link = document.createElement("a");
        link.href = action.href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = action.linkLabel;
        resultLine.append(" ", link);
    }

    terminalLog.append(entry);
    terminalLog.scrollTop = terminalLog.scrollHeight;
}

function runTerminalCommand(rawCommand) {
    const command = rawCommand.trim().toLowerCase();

    if (!command) {
        return;
    }

    if (command === "clear") {
        terminalLog.replaceChildren();
        return;
    }

    const response = Object.prototype.hasOwnProperty.call(terminalCommands, command)
        ? terminalCommands[command]
        : null;

    if (!response) {
        appendTerminalEntry(command, `No command called "${command}". Type "help" to see the shortcuts.`);
        return;
    }

    appendTerminalEntry(command, response.message, response);

    if (response.target) {
        document.getElementById(response.target).scrollIntoView({
            behavior: motionEnabled ? "smooth" : "auto",
            block: "start"
        });
    }
}

terminalForm.addEventListener("submit", (event) => {
    event.preventDefault();
    runTerminalCommand(terminalInput.value);
    terminalInput.value = "";
});

terminal.querySelectorAll("[data-terminal-command]").forEach((button) => {
    button.addEventListener("click", () => {
        const command = button.dataset.terminalCommand;
        terminalInput.value = command;
        runTerminalCommand(command);
        terminalInput.value = "";
        terminalInput.focus();
    });
});

const githubStats = document.querySelector("#github-stats");
const githubRepositories = document.querySelector("#github-repositories");

function formatCount(value) {
    return new Intl.NumberFormat().format(value);
}

function renderGithubStats(user, repositories) {
    const stars = repositories.reduce((total, repository) => total + repository.stargazers_count, 0);
    const languageCounts = repositories.reduce((counts, repository) => {
        if (repository.language) {
            counts[repository.language] = (counts[repository.language] || 0) + 1;
        }
        return counts;
    }, {});
    const topLanguage = Object.entries(languageCounts).sort((left, right) => right[1] - left[1])[0]?.[0];
    const stats = [
        ["Public repositories", user.public_repos],
        ["Followers", user.followers],
        ["Stars across fetched repos", stars],
        ["Top language in fetched repos", topLanguage || "Not listed"]
    ];

    githubStats.replaceChildren();
    stats.forEach(([label, value]) => {
        const item = document.createElement("div");
        item.className = "github-stat";
        const number = document.createElement("strong");
        number.textContent = typeof value === "number" ? formatCount(value) : value;
        const caption = document.createElement("span");
        caption.textContent = label;
        item.append(number, caption);
        githubStats.append(item);
    });
}

function renderGithubRepositories(repositories) {
    const relevantRepositories = [...repositories]
        .sort((left, right) => {
            const leftScore = (left.language === "Java" ? 2 : 0) + (left.stargazers_count > 0 ? 1 : 0);
            const rightScore = (right.language === "Java" ? 2 : 0) + (right.stargazers_count > 0 ? 1 : 0);
            return rightScore - leftScore || new Date(right.updated_at) - new Date(left.updated_at);
        })
        .slice(0, 3);

    githubRepositories.replaceChildren();

    if (relevantRepositories.length === 0) {
        const empty = document.createElement("p");
        empty.className = "profile-status";
        empty.textContent = "No public repositories were returned by GitHub.";
        githubRepositories.append(empty);
        return;
    }

    relevantRepositories.forEach((repository) => {
        const card = document.createElement("article");
        card.className = "repository-card";
        const title = document.createElement("h5");
        const link = document.createElement("a");
        link.href = `https://github.com/gr8swati/${encodeURIComponent(repository.name)}`;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = repository.name;
        title.append(link);

        const description = document.createElement("p");
        description.textContent = repository.description || "No public description provided.";

        const metadata = document.createElement("div");
        metadata.className = "repository-meta";
        const language = repository.language || "Language not listed";
        const updatedDate = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short" }).format(new Date(repository.updated_at));
        metadata.textContent = `${language} · ${formatCount(repository.stargazers_count)} stars · ${formatCount(repository.forks_count)} forks · Updated ${updatedDate}`;
        card.append(title, description, metadata);

        if (Array.isArray(repository.topics) && repository.topics.length > 0) {
            const topics = document.createElement("div");
            topics.className = "repository-topics";
            repository.topics.slice(0, 4).forEach((topic) => {
                const badge = document.createElement("span");
                badge.textContent = topic;
                topics.append(badge);
            });
            card.append(topics);
        }

        githubRepositories.append(card);
    });
}

async function loadGithubProfile() {
    const status = githubStats.querySelector("[data-github-status]");
    const repositoryStatus = githubRepositories.querySelector("[data-repository-status]");

    try {
        const [userResponse, repositoriesResponse] = await Promise.all([
            fetch("https://api.github.com/users/gr8swati", { headers: { Accept: "application/vnd.github+json" } }),
            fetch("https://api.github.com/users/gr8swati/repos?per_page=100&sort=updated", { headers: { Accept: "application/vnd.github+json" } })
        ]);

        if (!userResponse.ok || !repositoriesResponse.ok) {
            throw new Error(`GitHub public API returned HTTP ${userResponse.status}/${repositoriesResponse.status}.`);
        }

        const [user, repositories] = await Promise.all([userResponse.json(), repositoriesResponse.json()]);

        if (
            !user ||
            !Number.isInteger(user.public_repos) ||
            !Number.isInteger(user.followers) ||
            !Array.isArray(repositories) ||
            repositories.some((repository) =>
                !repository ||
                typeof repository.name !== "string" ||
                typeof repository.language !== "string" && repository.language !== null ||
                !Number.isFinite(repository.stargazers_count) ||
                !Number.isFinite(repository.forks_count) ||
                !Number.isFinite(Date.parse(repository.updated_at))
            )
        ) {
            throw new Error("GitHub returned an unexpected public profile or repository response.");
        }

        renderGithubStats(user, repositories);
        renderGithubRepositories(repositories);
    } catch (error) {
        console.error("Unable to load public GitHub profile data.", error);
        status.textContent = "Live public profile data is temporarily unavailable.";
        repositoryStatus.textContent = "Try the GitHub profile link for repositories.";
    }
}

loadGithubProfile();

const architectureDetails = {
    client: ["Client request", "A client calls a REST endpoint to begin a patient or booking workflow. This is an illustrative entry point, not a published production endpoint."],
    security: ["API security", "Spring Security and JWT were part of the supplied implementation details. Authentication and role checks belong at the protected API boundary."],
    service: ["Domain services", "The project description identifies doctor, booking, patient, prescription, order, and payment domains. The diagram groups them for readability."],
    database: ["Persistence", "MySQL with Spring Data JPA and Hibernate supports the persistence layer described for the project."],
    producer: ["Service event", "A service can publish an event when work should proceed asynchronously. This simplified flow illustrates the Kafka usage described for the project."],
    kafka: ["Message broker", "Apache Kafka provides event-based communication between services, reducing direct coupling between producer and consumer workflows."],
    consumer: ["Downstream service", "A downstream consumer handles an event independently. Retry and delivery guarantees depend on the actual service configuration and are not asserted here."]
};
const architectureFlows = document.querySelectorAll(".architecture-flow");
const architectureModeButtons = document.querySelectorAll("[data-flow-mode]");
const architectureTitle = document.querySelector("#architecture-detail-title");
const architectureCopy = document.querySelector("#architecture-detail-copy");

function showArchitectureDetails(node) {
    const details = architectureDetails[node];

    if (!details) {
        return;
    }

    architectureTitle.textContent = details[0];
    architectureCopy.textContent = details[1];
    document.querySelectorAll(".architecture-node").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.architectureNode === node));
    });
}

document.querySelectorAll("[data-architecture-node]").forEach((button) => {
    button.addEventListener("click", () => showArchitectureDetails(button.dataset.architectureNode));
});

architectureModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const mode = button.dataset.flowMode;
        architectureModeButtons.forEach((modeButton) => {
            const isActive = modeButton === button;
            modeButton.classList.toggle("is-active", isActive);
            modeButton.setAttribute("aria-pressed", String(isActive));
        });
        architectureFlows.forEach((flow) => {
            flow.hidden = flow.dataset.flow !== mode;
        });
        const firstNode = document.querySelector(`.architecture-flow[data-flow="${mode}"] [data-architecture-node]`);
        showArchitectureDetails(firstNode.dataset.architectureNode);
    });
});

const skillNotes = {
    "Java": ["Object-oriented language features, collections, exception handling, and concurrency fundamentals.", "Used across the healthcare platform and booking backend case studies."],
    "Spring Boot": ["Application configuration, dependency injection, REST controllers, and service composition.", "Used across the healthcare platform and booking backend case studies."],
    "Spring MVC": ["Request mapping, controller boundaries, validation, and HTTP response handling.", "Listed in the supplied backend skill set; no specific project association was supplied."],
    "Spring Security": ["Authentication filters, authorization rules, and role-based access control.", "The healthcare and hotel booking project descriptions include Spring Security."],
    "Microservices": ["Domain boundaries, independent service responsibilities, and service-to-service communication.", "The healthcare project description covers decomposition into doctor, booking, patient, prescription, order, and payment services."],
    "REST APIs": ["Resource-oriented routes, HTTP semantics, request validation, and stable response contracts.", "Used in the described logistics, healthcare, and hotel booking workflows."],
    "Web Services": ["Service contracts, request/response boundaries, and integration behavior.", "Listed in the supplied backend skill set; no specific project association was supplied."],
    "JWT": ["Signed claims and token-based authentication; tokens still require expiry and authorization checks.", "JWT appears in the healthcare and hotel booking security descriptions."],
    "MySQL": ["Relational modeling, constraints, indexing, and transactional persistence.", "Used in the healthcare and hotel booking project descriptions."],
    "Spring Data JPA": ["Repository abstractions and mapping domain entities to relational data.", "Used in the healthcare and hotel booking project descriptions."],
    "JPA": ["Entity mapping, persistence contexts, and transaction-aware database access.", "Used in the hotel booking trainee role and healthcare platform description."],
    "Hibernate": ["An ORM implementation for mapping Java domain objects to relational storage.", "Included in the healthcare project technology description."],
    "Kafka": ["Producers, topics, consumers, and asynchronous event-based communication.", "Kafka-based service communication is described for the healthcare platform."],
    "AWS": ["Cloud infrastructure and managed services; select services based on security and operational requirements.", "The supplied healthcare project notes include AWS EC2, S3, and CloudWatch."],
    "Docker": ["Container images and reproducible application packaging.", "Docker is included in the healthcare platform implementation notes."],
    "Kubernetes": ["Container orchestration concepts such as deployments, services, and health checks.", "Listed in the supplied skill set; no specific project association was supplied."],
    "Jenkins": ["Build and delivery automation through repeatable pipeline stages.", "Jenkins CI/CD is included in the healthcare platform implementation notes."],
    "CI/CD": ["Automated validation and repeatable delivery pipelines.", "The healthcare project description includes Jenkins CI/CD."],
    "DevOps": ["Collaboration between development and operations through automation and observability.", "Listed in the supplied skill set; no specific project association was supplied."],
    "JUnit": ["Unit test structure, assertions, and isolated behavior verification.", "Listed in the supplied testing skills; no specific test suite was supplied."],
    "Mockito": ["Test doubles for isolating collaborators in unit tests.", "Listed in the supplied testing skills; no specific test suite was supplied."],
    "Git": ["Change history, branches, and collaborative version control.", "Used in the trainee role's Agile development workflow."],
    "GitHub": ["Public code hosting and collaboration; profile data below is fetched from GitHub's public API.", "View public repositories in the GitHub dashboard below."],
    "JIRA": ["Issue tracking and planning across collaborative development work.", "Jira is listed among the current role's tools."],
    "Agile": ["Iterative delivery, feedback, and team coordination.", "The hotel booking trainee role described an Agile development environment."]
};
const skillTitle = document.querySelector("#skill-detail-title");
const skillCopy = document.querySelector("#skill-detail-copy");
const skillLink = document.querySelector("#skill-detail-link");

document.querySelectorAll(".skill-tags li").forEach((item) => {
    const skill = item.textContent.trim();
    const button = document.createElement("button");
    button.className = "skill-chip";
    button.type = "button";
    button.textContent = skill;
    button.setAttribute("aria-pressed", "false");
    item.replaceChildren(button);
    button.addEventListener("click", () => {
        document.querySelectorAll(".skill-chip").forEach((chip) => {
            chip.setAttribute("aria-pressed", String(chip === button));
        });
        const [concept, projectContext] = skillNotes[skill] || [
            "Core concepts depend on the specific implementation and version.",
            "This technology is listed in the supplied skills; no project-specific usage was provided."
        ];
        skillTitle.textContent = skill;
        skillCopy.textContent = `${concept} ${projectContext}`;
        if (projectContext.includes("GitHub")) {
            skillLink.href = "#github-profile";
            skillLink.textContent = "View GitHub profile data";
        } else if (projectContext.includes("no specific project association")) {
            skillLink.href = "#experience";
            skillLink.textContent = "See professional experience";
        } else {
            skillLink.href = "#projects";
            skillLink.textContent = "Explore related project work";
        }
    });
});

const apiEndpoint = document.querySelector("#demo-endpoint");
const apiInput = document.querySelector("#api-input");
const apiInputLabel = document.querySelector('label[for="api-input"]');
const apiResponseStatus = document.querySelector("#api-response-status");
const apiResponseBody = document.querySelector("#api-response-body");

apiEndpoint.addEventListener("change", () => {
    const isAppointment = apiEndpoint.value === "appointment";
    apiInputLabel.textContent = isAppointment ? "Patient name" : "Specialty";
    apiInput.placeholder = isAppointment ? "e.g. Sample patient" : "e.g. cardiology";
    apiInput.value = "";
});

document.querySelector("#api-playground-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const value = apiInput.value.trim();
    const isAppointment = apiEndpoint.value === "appointment";
    const endpoint = isAppointment ? "POST /api/appointments" : "GET /api/doctors";
    let status = 200;
    let response;

    if (!value) {
        status = 400;
        response = {
            error: "VALIDATION_ERROR",
            message: `Enter a ${isAppointment ? "patient name" : "specialty"} to try this example.`,
            simulated: true
        };
    } else if (isAppointment) {
        status = 201;
        response = {
            message: "Example appointment accepted by the simulated handler.",
            data: {
                reference: "DEMO-ONLY",
                patient: value,
                status: "SIMULATED"
            },
            simulated: true
        };
    } else {
        response = {
            data: [
                {
                    id: "sample-result",
                    specialty: value
                }
            ],
            note: "Illustrative response only; no doctor directory was queried.",
            simulated: true
        };
    }

    apiResponseStatus.textContent = `${endpoint} · ${status}`;
    apiResponseBody.textContent = JSON.stringify(response, null, 2);
});

motionPreference.addEventListener("change", (event) => {
    motionEnabled = !event.matches;
    updateMotionControl();

    if (motionEnabled) {
        drawNetwork();
        startNetwork();
    } else {
        stopNetwork();
        drawNetwork();
    }
});

let progressFrame = 0;

function updateReadingProgress() {
    const scrollableDistance = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollableDistance > 0 ? window.scrollY / scrollableDistance : 0;
    progressFill.style.transform = `scaleX(${Math.min(1, Math.max(0, progress))})`;
    progressFrame = 0;
}

window.addEventListener("scroll", () => {
    if (!progressFrame) {
        progressFrame = window.requestAnimationFrame(updateReadingProgress);
    }
}, { passive: true });

window.addEventListener("resize", updateReadingProgress, { passive: true });
updateReadingProgress();

if (canRevealOnScroll) {
    document.documentElement.classList.add("js-enabled");

    const revealElements = document.querySelectorAll(
        ".hero-copy, .hero-profile, .section-heading, .experience-card, .project-card, .skill-group, .achievement-card, .principle-grid article, .education-card, .contact-layout"
    );

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) {
                return;
            }

            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
        });
    }, {
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.08
    });

    revealElements.forEach((element, index) => {
        element.classList.add("reveal");
        element.dataset.revealDelay = String(index % 4);
        revealObserver.observe(element);
    });
}

const menuButton = document.querySelector(".nav-toggle");
const navigation = document.querySelector("#site-nav");

function closeMenu() {
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open navigation");
    navigation.dataset.open = "false";
    document.body.classList.remove("menu-open");
}

menuButton.addEventListener("click", () => {
    const isExpanded = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!isExpanded));
    menuButton.setAttribute("aria-label", isExpanded ? "Open navigation" : "Close navigation");
    navigation.dataset.open = String(!isExpanded);
    document.body.classList.toggle("menu-open", !isExpanded);
});

navigation.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
        closeMenu();
        menuButton.focus();
    }
});

window.matchMedia("(min-width: 1101px)").addEventListener("change", (event) => {
    if (event.matches) {
        closeMenu();
    }
});

const sections = document.querySelectorAll("main section[id], main article[id]");
const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) {
            return;
        }

        document.querySelectorAll(".nav-link").forEach((link) => {
            if (link.getAttribute("href") === `#${entry.target.id}`) {
                link.setAttribute("aria-current", "location");
            } else {
                link.removeAttribute("aria-current");
            }
        });
    });
}, {
    rootMargin: "-35% 0px -55% 0px",
    threshold: 0
});

sections.forEach((section) => sectionObserver.observe(section));

document.querySelectorAll(".project-card, .skill-group, .achievement-card, .experience-card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
        if (event.pointerType === "touch" || !motionEnabled) {
            return;
        }

        const bounds = card.getBoundingClientRect();
        card.style.setProperty("--pointer-x", `${event.clientX - bounds.left}px`);
        card.style.setProperty("--pointer-y", `${event.clientY - bounds.top}px`);
        card.style.setProperty("--tilt-x", `${((event.clientY - bounds.top) / bounds.height - 0.5) * -4}deg`);
        card.style.setProperty("--tilt-y", `${((event.clientX - bounds.left) / bounds.width - 0.5) * 4}deg`);
    });
    card.addEventListener("pointerleave", () => {
        card.style.removeProperty("--tilt-x");
        card.style.removeProperty("--tilt-y");
    });
});

const cubeStage = document.querySelector(".cube-stage");
const cubeConstellation = document.querySelector(".cube-constellation");
let cubeRotationX = -18;
let cubeRotationY = -28;
let cubeDrag = null;

function renderCubeRotation() {
    cubeConstellation.style.setProperty("--cube-rotate-x", `${cubeRotationX}deg`);
    cubeConstellation.style.setProperty("--cube-rotate-y", `${cubeRotationY}deg`);
}

cubeStage.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
        return;
    }

    cubeDrag = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY
    };
    cubeStage.setPointerCapture(event.pointerId);
    cubeStage.classList.add("is-dragging");
});

cubeStage.addEventListener("pointermove", (event) => {
    if (!cubeDrag || cubeDrag.pointerId !== event.pointerId) {
        return;
    }

    cubeRotationY += (event.clientX - cubeDrag.x) * 0.7;
    cubeRotationX -= (event.clientY - cubeDrag.y) * 0.7;
    cubeRotationX = Math.max(-75, Math.min(75, cubeRotationX));
    cubeDrag.x = event.clientX;
    cubeDrag.y = event.clientY;
    renderCubeRotation();
});

function finishCubeDrag(event) {
    if (!cubeDrag || cubeDrag.pointerId !== event.pointerId) {
        return;
    }

    cubeDrag = null;
    cubeStage.classList.remove("is-dragging");
}

cubeStage.addEventListener("pointerup", finishCubeDrag);
cubeStage.addEventListener("pointercancel", finishCubeDrag);
cubeStage.addEventListener("lostpointercapture", finishCubeDrag);
cubeStage.addEventListener("keydown", (event) => {
    const rotationStep = event.shiftKey ? 18 : 9;
    const rotations = {
        ArrowUp: [-rotationStep, 0],
        ArrowDown: [rotationStep, 0],
        ArrowLeft: [0, -rotationStep],
        ArrowRight: [0, rotationStep]
    };
    const rotation = rotations[event.key];

    if (!rotation) {
        return;
    }

    event.preventDefault();
    cubeRotationX = Math.max(-75, Math.min(75, cubeRotationX + rotation[0]));
    cubeRotationY += rotation[1];
    renderCubeRotation();
});

renderCubeRotation();

document.querySelectorAll("[data-open-dialog]").forEach((button) => {
    const dialogId = button.dataset.openDialog;
    const dialog = document.getElementById(dialogId);

    if (!(dialog instanceof HTMLDialogElement)) {
        console.error(`Project case study dialog not found: ${dialogId}`);
        return;
    }

    button.addEventListener("click", () => dialog.showModal());
    dialog.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            dialog.close();
        }
    });
    dialog.addEventListener("click", (event) => {
        if (event.target === dialog) {
            dialog.close();
        }
    });
});
