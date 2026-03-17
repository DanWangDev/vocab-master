Product Requirements Document (PRD): 11+ Vocabulary Master
Version: 1.2 (Web-Compatible) Status: Ready for Development Target Audience: Children (Age 10-11) preparing for UK Grammar School admission. Platform: Web / Tablet Browser (Responsive Design).

1. Executive Summary
A web-based vocabulary application designed to gamify the 11+ preparation process using "Farquhar" style vocabulary cards. The app features a central dashboard leading to three distinct modes: Study (Memory), Quiz (Practice), and Daily Challenge (Testing).

2. Navigation Architecture
Global Layout:

Main Screen (Dashboard): The entry point. Contains three large, distinct buttons/cards to launch each mode.

Top Bar (In-Game):

Left: "Back/Cancel" button (X icon) to return to the Dashboard.

Center: Mode Title / Progress Indicator.

Right: Timer (where applicable).

Card Navigation:

Due to web browser limitations with swipe gestures, all card switching must use distinct Left (<) and Right (>) arrow buttons placed on either side of the card container.

3. Data Model
Source: Local JSON file. Structure:

JSON

{
  "targetWord": "despised",
  "definition": ["to consider as beneath one's notice", "feel scorn and dislike for"],
  "synonyms": ["hate", "loathe", "detest"],
  "exampleSentence": ["She was despised as a hypocrite.", "I despise anchovies."]
}
4. Functional Requirements
4.1 Mode A: Study Mode (The "Deck")
Goal: Frictionless memorization.

UI Layout:

Central "Card" container.

Large "Previous" (<) and "Next" (>) buttons on the sides.

Interaction:

State 1 (Front): Shows targetWord in large, bold text.

Action: User clicks anywhere on the card body to flip.

State 2 (Back): Shows:

Definitions: Bulleted list.

Synonyms: Styled as "pill" tags (e.g., rounded colored backgrounds).

Example: One random sentence from the array.

Logic:

Use Fisher-Yates shuffle on load.

Clicking "Next" always resets the card to "Front" state for the new word.

4.2 Mode B: Custom Quiz
Goal: Low-pressure practice with configurable settings.

Setup Screen:

Slider: Number of Questions (5–50).

Input: Seconds per question (Default: 30).

Button: "Start Quiz".

Quiz Interface (MCQ Only):

Prompt: Randomly display ONE definition OR ONE synonym.

Options: 4 buttons (1 Correct targetWord + 3 Distractors).

Logic:

Correct Answer: Green highlight + Success Sound.

Wrong Answer: Red highlight + Shake animation; Correct answer highlights Green.

Auto-advance: No auto-advance (User clicks "Next" or arrow to proceed) OR optional 2-second auto-advance.

4.3 Mode C: Daily Challenge
Goal: High-stakes "Boss Battle" simulation.

Constraints:

Fixed Length: 20 Questions.

Fixed Timer: 25 Seconds per question (Countdown bar at top).

Scoring: Points for accuracy + speed.

Question Logic (Mixed Bag): For each question, the system randomly selects one of two formats:

Format A (Multiple Choice): Identical UI to Quiz Mode.

Format B (Type the Word):

Prompt: Displays a definition or synonym.

Interaction: Input field + "Submit" button.

Validation: User types targetWord. (Case-insensitive match).

Visuals:

Note: The screen never shows both formats simultaneously. It is either an MCQ screen OR an Input screen.

5. Technical Logic
5.1 Smart Distractor Algorithm (For MCQ)
To generate the 3 wrong options:

Priority 1: Select words starting with the same letter as the target.

Priority 2: Select words with similar character length (+/- 2 chars).

Fallback: Random selection from DB.

5.2 Helper Functions
getRandomDefinition(wordObj): Returns one string from the definition array.

getRandomSynonym(wordObj): Returns one string from the synonym array.

6. UI/UX Guidelines
Colors:

Dashboard: Neutral background, bright cards for modes.

Cards: White background with drop shadow (Elevation).

Arrows: High contrast (e.g., Dark Blue) against background.

Typography: Large, legible sans-serif fonts (e.g., 'Nunito' or 'Open Sans').

Responsiveness: The "Card" container must fit within a standard mobile browser view (portrait) without requiring scroll.