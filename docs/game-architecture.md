# Gameplay & Architecture Notes

## Core Mechanics (Updated 2026-05-10)

### Combo & Weapon System
- **Combo Calculation**: The combo count is persistent. It only resets to `0` when the player takes damage or fails to kill an enemy before it reaches the bottom of the screen (leaking). Wrong math answers do **not** break the combo, making it friendlier for children.
- **Weapon Progression**: 
  - **Level 1**: Single bullet (Default)
  - **Level 2**: 3-way spread. Triggers automatically when `combo >= 3`.
  - **Level 3**: 5-way spread with particle effects. Triggers automatically when `combo >= 5`.
- **Damage Penalty**: Whenever the player takes damage (from enemy collision, enemy projectiles, or obstacles like meteors):
  - `combo` is reset to `0`.
  - `weaponLevel` degrades by 1 (`Math.max(1, weaponLevel - 1)`).

### Difficulty Scaling
- **Math Generation**: The maximum number generated for math problems scales linearly with the current stage: `limit = Math.min(100, stage * 10)`.
- **Mixed Operations**: To smooth the difficulty curve between simple addition/subtraction and larger numbers, mixed operations (e.g., `a + b - c`) are progressively introduced as the stage increases.

### Collision Detection
- Obstacles (like meteors) and enemies share a unified damage logic (`damagePlayer()` function). Colliding with a meteor destroys the player's bullet but penalizes the player identically to taking an enemy hit if the meteor hits the player.
