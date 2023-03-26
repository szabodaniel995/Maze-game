async function createMaze({ firstTime, cellsHorizontal = 4, cellsVertical = 2, level = 1, startRow, startColumn }) {
	// Initialization
		const { Engine, Render, Runner, Bodies, Composite, Body, Events, Common } = Matter;

		const width = window.innerWidth;
		let height = window.innerHeight;
		const unitLengthX = width / cellsHorizontal;
		const unitLengthY = height / cellsVertical;

		const engine = Engine.create();
		engine.gravity.y = 0;

		const { world } = engine;

		const game = document.querySelector("#game");

		const render = Render.create({
			element: game,
			engine: engine,
			options: {
				wireframes: false,
				width,
				height,
			},
		});

		Render.run(render);

		const runner = Runner.create();
		Runner.run(runner, engine);
	//

	// Adding outer walls
		const wallThickness = 2;
		const label = "wall";
		const walls = [
			Bodies.rectangle(width / 2, 0, width, wallThickness, { label, isStatic: true }),
			Bodies.rectangle(width / 2, height, width, wallThickness, { label, isStatic: true }),
			Bodies.rectangle(0, height / 2, wallThickness, height, { label, isStatic: true }),
			Bodies.rectangle(width, height / 2, wallThickness, height, { label, isStatic: true }),
		];

		Composite.add(world, walls);
	//

	// Displaying the welcome panel
		if (firstTime) {
			const welcomeMessage = document.querySelector(".info");
			const startButton = document.querySelector("#start");
			const infoButton = document.querySelector("#dev");
			const infoContent = document.querySelector(".devinfo");
			const infoCloseButton = document.querySelector("#devclose");

			welcomeMessage.classList.remove("is-hidden");

			startButton.addEventListener(
				"click",
				() => {
					welcomeMessage.classList.add("is-hidden");
					generateMaze().then(devListener.abort()).then(closeListener.abort());
				},
				{ once: true }
			);

			const devListener = new AbortController();

			infoButton.addEventListener("click", () => {
				infoContent.classList.remove("is-hidden");
			}, { signal: devListener.signal });

			const closeListener = new AbortController();

			infoCloseButton.addEventListener("click", () => {
				infoContent.classList.add("is-hidden");
			}, { signal: closeListener.signal });
		} else generateMaze();
	// 

	// Maze generation
		async function generateMaze() {
			// Custom shuffle algorithm
				function shuffle(array) {
					let index = array.length;

					while (index > 0) {
						const exchangeIndex = Math.floor(Math.random() * index);

						index--;
						const temp = array[index];
						array[index] = array[exchangeIndex];
						array[exchangeIndex] = temp;
					}
					return array;
				}
			//

			// Grid and helper arrays
				const grid = Array(cellsVertical)
					.fill(false)
					.map(() => Array(cellsHorizontal).fill(false));
				const horizontals = Array(cellsVertical - 1)
					.fill(null)
					.map(() => Array(cellsHorizontal).fill(false));
				const verticals = Array(cellsVertical)
					.fill(null)
					.map(() => Array(cellsHorizontal - 1).fill(false));
			//

			// Random startpoint generation
				if (!startRow) startRow = Math.floor(Math.random() * cellsVertical);
				if (!startColumn) startColumn = Math.floor(Math.random() * cellsHorizontal);
			//

			// Recursive maze generation
				const recursion = (row, column) => {
					// Mark this cell as being visited
					grid[row][column] = true;

					// Assemble randomly-ordered list of neighbors
					const options = shuffle([
						[row - 1, column, "up"],
						[row, column + 1, "right"],
						[row, column - 1, "left"],
						[row + 1, column, "down"],
					]);

					// For each neighbor...
					for (let option of options) {
						const [nextRow, nextColumn, direction] = option;

						// If the option is out of the maze bounds, skip current iteration and continue with the next one
						if (nextRow < 0 || nextRow > cellsVertical - 1 || nextColumn < 0 || nextColumn > cellsHorizontal - 1) continue;

						// If we have already visited this neighbor, skip, and continue with the next neighbor
						if (grid[nextRow][nextColumn]) continue;

						// Remove a wall from either the horizontals or verticals array (false -> true). Randomization comes from the shuffle function
						if (direction === "up") {
							horizontals[nextRow][nextColumn] = true;
						} else if (direction === "right") {
							verticals[nextRow][nextColumn - 1] = true;
						} else if (direction === "down") {
							horizontals[nextRow - 1][nextColumn] = true;
						} else if (direction === "left") {
							verticals[nextRow][nextColumn] = true;
						}

						// Visit that next cell (=call the recursive function with that row & column)
						recursion(nextRow, nextColumn);
					}
				};
			//

		// Calling the recursive function
		recursion(startRow, startColumn);

		// Adding the inner walls based on the horizontals and verticals 2d arrays
			horizontals.forEach((row, rowIndex) => {
				row.forEach((open, columnIndex) => {
					if (open) return;

					const wall = Bodies.rectangle(
						unitLengthX / 2 + unitLengthX * columnIndex,
						unitLengthY + unitLengthY * rowIndex,
						unitLengthX + 7.5,
						10,
						{
							isStatic: true,
							render: {
								fillStyle: "red",
							},
						}
					);
					Composite.add(world, wall);
				});
			});

			verticals.forEach((row, rowIndex) => {
				row.forEach((open, columnIndex) => {
					if (open) return;

					const wall = Bodies.rectangle(unitLengthX + unitLengthX * columnIndex, unitLengthY / 2 + unitLengthY * rowIndex, 10,
					unitLengthY + 7.5, {
						isStatic: true,
						render: {
							fillStyle: "red",
						},
					});
					Composite.add(world, wall);
				});
			});
		//

		// Addin the goal, represented by a green rectangle
			const w = Math.min(unitLengthX, unitLengthY) * 0.6;
			const goal = Bodies.rectangle(width - unitLengthX / 2, height - unitLengthY / 2, w, w, {
				isStatic: true,
				label: "goal",
				render: {
					fillStyle: "green",
				},
			});
			Composite.add(world, goal);
		//

		// Adding the ball, represented by a blue circle
			const diameter = Math.min(unitLengthX, unitLengthY) / 2;
			const ball = Bodies.circle(unitLengthX / 2, unitLengthY / 2, 0.6 * diameter, {
				label: "ball",
				render: {
					fillStyle: "blue",
				},
				mass: 40,
				inertia: 12000,
			});
			Composite.add(world, ball);
		//

		// Adding controls

			// Gyro control for mobile devices
				const speed = 0.02;
	
				if (typeof window !== "undefined") {
					const updateGravity = function (event) {
						const orientation = typeof window.orientation !== "undefined" ? window.orientation : 0;

						if (orientation === 0) {
							Body.applyForce(ball, { x: ball.position.x, y: ball.position.y }, { 
								x: Common.clamp(event.gamma, -speed, speed), 
								y: Common.clamp(event.beta, -speed, speed) 
							});
						} else if (orientation === 180) {
							Body.applyForce(ball, { x: ball.position.x, y: ball.position.y }, { 
								x: Common.clamp(event.gamma, -speed, speed), 
								y: Common.clamp(-event.beta, -speed, speed) 
							});
						} else if (orientation === 90) {
							Body.applyForce(ball, { x: ball.position.x, y: ball.position.y }, { 
								x: Common.clamp(event.beta, -speed, speed), 
								y: Common.clamp(-event.gamma, -speed, speed) 
							});
						} else if (orientation === -90) {
							Body.applyForce(ball, { x: ball.position.x, y: ball.position.y }, { 
								x: Common.clamp(-event.beta, -speed, speed), 
								y: Common.clamp(event.gamma, -speed, speed) 
							});
						}
					};
					
					window.addEventListener("deviceorientation", updateGravity);
				}
			// 

			// Keyboard controls for desktops
				const keyHandlers = {
					KeyW: () => {
						Body.applyForce(ball, { x: ball.position.x, y: ball.position.y }, { x: 0, y: -speed });
					},
					KeyA: () => {
						Body.applyForce(ball, { x: ball.position.x, y: ball.position.y }, { x: -speed, y: 0 });
					},
					KeyS: () => {
						Body.applyForce(ball, { x: ball.position.x, y: ball.position.y }, { x: 0, y: speed });
					},
					KeyD: () => {
						Body.applyForce(ball, { x: ball.position.x, y: ball.position.y }, { x: speed, y: 0 });
					},
				};

				const keysDown = new Set();

				document.addEventListener("keydown", event => keysDown.add(event.code));
				document.addEventListener("keyup", event => keysDown.delete(event.code));

				Matter.Events.on(engine, "beforeUpdate", () => {
					[...keysDown].forEach(k => keyHandlers[k]?.());
				});
			// 
		//
	}

	// Declaring win condition (on the start of a collision between the ball and the goal)
		Events.on(engine, "collisionStart", event => {
			const collision = ["ball", "goal"];
			event.pairs.forEach(pair => {
				if (collision.includes(pair.bodyA.label) && collision.includes(pair.bodyB.label)) {
					engine.gravity.y = 1;
					world.bodies.forEach(body => {
						if (body.label.includes("wall")) return;
						Body.set(body, { isStatic: false });
					});
					if (level >= 5) {
						document.querySelector(".complete").classList.remove("is-hidden");
						stopExecution();
					} else {
						document.querySelector(".win").classList.remove("is-hidden");
					}
				}
			});
		});
	//

	// Helper function to prevent further execution upon completing the game
		function stopExecution() {
			return;
		}
	//

	// Adding next level and restart level functionality
		const nextLevel = document.querySelector("#next");
		const restartLevel = document.querySelector("#restart");

		function levelChange() {
			Composite.clear(world);
			Engine.clear(engine);
			Render.stop(render);
			Runner.stop(runner);
			render.canvas.remove();

			document.querySelector(".win").classList.add("is-hidden");

			document.removeEventListener("keydown", event => {
				keysDown.add(event.code);
			});
			document.removeEventListener("keyup", event => {
				keysDown.delete(event.code);
			});

			restartLevel.removeEventListener("click", restartLevelFunction);
			nextLevel.removeEventListener("click", nextLevelFunction);
		}

		function restartLevelFunction(event) {
			event.preventDefault();
			levelChange();

			createMaze({ cellsHorizontal, cellsVertical, level });
		}

		function nextLevelFunction(event) {
			event.preventDefault();
			levelChange();

			level++;
			document.querySelector(".level").innerHTML = `Level ${level}/5`;

			createMaze({ cellsHorizontal: cellsHorizontal + 2, cellsVertical: cellsVertical + 1, level });
		}

		restartLevel.addEventListener("click", restartLevelFunction);
		nextLevel.addEventListener("click", nextLevelFunction);
	//
}

// Calling the first execution - instantly on PC, but only after rotating to landscape view on mobile
const orientationListener = new AbortController();

if (screen.orientation.type === "landscape-primary") {
	createMaze({ firstTime: 1 });
} else {
	window.addEventListener("deviceorientation", async () => {
			if (screen.orientation.angle === 90) {
				createMaze({ firstTime: 1 })
				.then(orientationListener.abort());
			}
		},
		{ signal: orientationListener.signal }
	);
}
