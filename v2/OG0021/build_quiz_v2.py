from openpyxl import Workbook
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
from openpyxl.utils import get_column_letter

OUT = "OG0021_ReadingQuiz.xlsx"

C_HEADER = "1F4E79"
C_SUB = "2E75B6"
C_ACCENT = "BDD7EE"
C_YELLOW = "FFF2CC"
C_GREEN = "E2EFDA"
C_ORANGE = "FCE4D6"
C_OK = "70AD47"
C_PART = "FFD966"
C_LOW = "FFEECC"
C_BAD = "FFCCCC"


def style_cell(c, fill=None, bold=False, color="000000", size=9, align="left"):
    if fill:
        c.fill = PatternFill("solid", fgColor=fill)
    c.font = Font(bold=bold, color=color, size=size)
    c.alignment = Alignment(horizontal=align, vertical="center", wrap_text=True)
    c.border = Border(
        left=Side(style="thin", color="BFBFBF"),
        right=Side(style="thin", color="BFBFBF"),
        top=Side(style="thin", color="BFBFBF"),
        bottom=Side(style="thin", color="BFBFBF"),
    )
    return c


def header(ws, row, col, value, fill=C_SUB, size=10):
    return style_cell(ws.cell(row, col, value), fill=fill, bold=True, color="FFFFFF", size=size, align="center")


def merge_title(ws, cell_range, text):
    ws.merge_cells(cell_range)
    c = ws[cell_range.split(":")[0]]
    style_cell(c, C_HEADER, True, "FFFFFF", 12, "center")
    c.value = text


def set_widths(ws, widths):
    for idx, width in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(idx)].width = width


def option_fill(score):
    if score == 100:
        return C_OK
    if score >= 30:
        return C_PART
    if score > 0:
        return C_LOW
    return C_BAD


wb = Workbook()

# QUIZ_LIST
ws = wb.active
ws.title = "QUIZ_LIST"
set_widths(ws, [8, 20, 22, 30, 18, 18, 12, 22, 22, 18])
merge_title(ws, "A1:J1", "OG0021 Reading Quiz v2 — Story Grammar + Synthesis")
ws.row_dimensions[1].height = 28
cols = ["Q_ID", "Quiz Type", "Primary Story Grammar", "Question (EN)", "Resource", "Correct Answer", "Max Score", "LRS sg_element", "Scoring Mode", "Sheet Ref"]
for i, h in enumerate(cols, 1):
    header(ws, 2, i, h)
ws.row_dimensions[2].height = 30
rows = [
    ["Q01", "Setting Builder", "Setting", "Build the story setting.", "label cards", "who=Milo / where=home / situation=has colors", 100, "setting", "Component Weight", "Q01_SETTING"],
    ["Q02", "Listening Scene Match", "Initiating Event", "Listen. Which scene starts the problem?", "Audio + SC02/03/06/09", "Option A", 100, "initiating_event", "Weighted MCQ", "Q02_INIT_EVENT"],
    ["Q03", "Scene-Anchored Unscramble", "Attempt", "Look at the scene. Build what Milo does.", "SC03 image", "Milo looks for his lost color.", 100, "attempt", "Weighted Unscramble", "Q03_ATTEMPT"],
    ["Q04", "Feeling Match", "Reaction", "How does Milo react in this scene?", "SC06 image", "Option B", 100, "reaction", "Weighted MCQ", "Q04_REACTION"],
    ["Q05", "Thought Bubble", "Internal Response", "Put Milo's thought in the bubble.", "SC06 image", "Option A", 100, "internal_response", "Weighted Thought Card", "Q05_INTERNAL"],
    ["Q06", "Cause→Result Chain", "Consequence", "Make the cause and result chain.", "text cards", "cry → colors come back", 100, "consequence", "Component Weight", "Q06_CONSEQUENCE"],
    ["Q07", "Synthesis MCQ", "Synthesis", "What did Milo find out at the end?", "-", "Option C", 100, "synthesis", "Weighted MCQ", "Q07_SYNTHESIS"],
]
for r, row in enumerate(rows, 3):
    for c, v in enumerate(row, 1):
        style_cell(ws.cell(r, c, v))
    ws.row_dimensions[r].height = 28
ws.merge_cells("A11:J11")
style_cell(ws["A11"], C_GREEN, False, "000000", 9, "left").value = "v2 keeps one primary Story Grammar element per scored question. Q7 Synthesis is reported separately from the six-axis graph."


def make_option_sheet(title, sheet, question, options, lrs, resource="-"):
    ws = wb.create_sheet(sheet)
    set_widths(ws, [8, 36, 12, 20, 20, 24, 28, 28, 22])
    merge_title(ws, "A1:I1", title)
    ws.row_dimensions[1].height = 26
    ws.merge_cells("A2:I2")
    style_cell(ws["A2"], C_YELLOW, True, "000000", 9).value = "Question: " + question
    if resource != "-":
        ws.merge_cells("A3:I3")
        style_cell(ws["A3"], C_ACCENT, False, "000000", 9).value = "Resource: " + resource
    hdrs = ["Option", "Option Text", "Is Correct?", "Score", "SG Element", "Distractor Type", "Distractor Rationale", "Student Weakness Signal", "LRS sg_element"]
    start = 5 if resource != "-" else 4
    for i, h in enumerate(hdrs, 1):
        header(ws, start, i, h)
    for r, row in enumerate(options, start + 1):
        fill = option_fill(row[3])
        for c, v in enumerate(row, 1):
            bg = fill if c in (1, 3, 4) else None
            style_cell(ws.cell(r, c, v), bg, c in (1, 3, 4) and row[3] == 100, "FFFFFF" if bg == C_OK and c in (1, 3, 4) else "000000")
        ws.row_dimensions[r].height = 36
    foot = start + len(options) + 2
    ws.merge_cells(start_row=foot, start_column=1, end_row=foot, end_column=9)
    style_cell(ws.cell(foot, 1), C_GREEN, True, "000000", 9).value = f'LRS xAPI: verb="answered" | object="quiz_OG0021_{sheet.lower()}" | result.sg_element="{lrs}" | result.score_raw=<pts>'


# Q01 Setting
ws = wb.create_sheet("Q01_SETTING")
set_widths(ws, [8, 18, 24, 14, 20, 28, 28, 24, 22])
merge_title(ws, "A1:I1", "Q01 — Setting Builder | Story Grammar: Setting")
ws.row_dimensions[1].height = 26
ws.merge_cells("A2:I2")
style_cell(ws["A2"], C_YELLOW, True).value = "Question: Build the story setting by placing cards into Who / Where / At first slots."
for i, h in enumerate(["Slot", "Correct Card", "SG Role", "Slot Weight", "Near-Miss Examples", "Weight Rationale", "Max Points", "Error Tag", "LRS"], 1):
    header(ws, 4, i, h)
data = [
    ["Who", "Milo", "Character in setting", 25, "butterfly", "Identifies the story focus before the problem begins.", "=D5/SUM($D$5:$D$7)*100", "setting_actor_confusion", "setting"],
    ["Where", "his colorful home", "Place / initial world", 35, "blue pond", "Separates opening place from later consequence scene.", "=D6/SUM($D$5:$D$7)*100", "setting_place_shift", "setting"],
    ["At first", "has many colors", "Initial situation", 40, "lost color", "Distinguishes normal beginning from initiating event.", "=D7/SUM($D$5:$D$7)*100", "initial_state_problem_confusion", "setting"],
]
for r, row in enumerate(data, 5):
    for c, v in enumerate(row, 1):
        style_cell(ws.cell(r, c, v), C_YELLOW if r in (5, 7) else C_GREEN)
    ws.row_dimensions[r].height = 30
for c, v in [(1, "TOTAL"), (4, "=SUM(D5:D7)"), (7, "=SUM(G5:G7)")]:
    style_cell(ws.cell(8, c, v), C_ACCENT, True, "000000", 9, "center")

# Q02
make_option_sheet(
    "Q02 — Listening Scene Match | Story Grammar: Initiating Event",
    "Q02_INIT_EVENT",
    "Listen. Which scene starts the problem?",
    [
        ["A", "OG0021_SC02_I", "YES", 100, "Initiating Event", "Correct", "Milo wakes up gray; the story problem begins.", "-", "initiating_event"],
        ["B", "OG0021_SC03_I", "NO", 20, "Attempt", "Later action", "Student chooses the search after the problem, not the problem itself.", "Event/action sequence confusion", "attempt"],
        ["C", "OG0021_SC06_I", "NO", 30, "Reaction", "Result scene", "Student focuses on sadness after the problem.", "Initiating event vs reaction confusion", "reaction"],
        ["D", "OG0021_SC09_I", "NO", 0, "Resolution", "Opposite phase", "Student chooses a late recovery scene.", "Story direction weakness", "consequence"],
    ],
    "initiating_event",
    "Audio/OG0021_SC02_ST01_N_A.mp3",
)

# Q03
ws = wb.create_sheet("Q03_ATTEMPT")
set_widths(ws, [6, 18, 18, 14, 14, 16, 18, 24, 24])
merge_title(ws, "A1:I1", "Q03 — Scene-Anchored Unscramble | Story Grammar: Attempt")
ws.merge_cells("A2:I2")
style_cell(ws["A2"], C_YELLOW, True).value = "Question: Look at SC03. Build what Milo does."
ws.merge_cells("A3:I3")
style_cell(ws["A3"], C_YELLOW).value = 'Correct sentence: "Milo looks for his lost color."'
ws.merge_cells("A4:I4")
style_cell(ws["A4"], C_ACCENT).value = "Scrambled words: looks | color. | his | Milo | lost | for"
for i, h in enumerate(["Word", "Correct Pos", "Grammar Role", "Word Weight", "Weight Rationale", "Max Points", "Error Tag"], 1):
    header(ws, 6, i, h)
words = [
    ["Milo", 1, "Subject", 1.5, "Identifies actor of attempt.", "=D7/SUM($D$7:$D$12)*100", "actor_order"],
    ["looks", 2, "Action verb", 2.5, "Core attempt action; highest weight.", "=D8/SUM($D$7:$D$12)*100", "attempt_action"],
    ["for", 3, "Preposition", 1.5, "Links action to goal.", "=D9/SUM($D$7:$D$12)*100", "goal_link"],
    ["his", 4, "Possessive", 1.0, "Small syntax support.", "=D10/SUM($D$7:$D$12)*100", "possessive"],
    ["lost", 5, "Goal state", 2.0, "Shows the problem he is trying to solve.", "=D11/SUM($D$7:$D$12)*100", "problem_state"],
    ["color.", 6, "Goal noun", 2.5, "Core goal of the attempt.", "=D12/SUM($D$7:$D$12)*100", "attempt_goal"],
]
for r, row in enumerate(words, 7):
    for c, v in enumerate(row, 1):
        style_cell(ws.cell(r, c, v), C_GREEN if c == 6 else (C_YELLOW if c in (1, 3) else None), False, "000000", 9, "center" if c in (2, 4, 6) else "left")
    ws.row_dimensions[r].height = 30
for c, v in [(1, "TOTAL"), (4, "=SUM(D7:D12)"), (6, "=SUM(F7:F12)")]:
    style_cell(ws.cell(13, c, v), C_ACCENT, True, "000000", 9, "center")
ws.merge_cells("A15:I15")
header(ws, 15, 1, "SECTION B — Partial Score Examples")
for i, h in enumerate(["Student Answer", "Score", "Interpretation", "Weakness Signal"], 1):
    header(ws, 16, i, h, C_ACCENT)
examples = [
    ["Milo looks for his lost color.", 100, "Attempt action and goal fully understood.", "-"],
    ["Milo looks for lost his color.", 83, "Core attempt understood; small syntax issue.", "possessive placement"],
    ["Milo color. lost his for looks", 14, "Goal words known but action chain is broken.", "attempt sequence weakness"],
]
for r, row in enumerate(examples, 17):
    for c, v in enumerate(row, 1):
        style_cell(ws.cell(r, c, v), option_fill(v) if c == 2 else None)

# Q04-Q07
make_option_sheet("Q04 — Feeling Match | Story Grammar: Reaction", "Q04_REACTION", "How does Milo react in this scene?", [
    ["A", "Happy", "NO", 0, "Reaction", "Opposite emotion", "Confuses resolution emotion with sadness.", "Temporal emotion confusion", "reaction"],
    ["B", "Sad", "YES", 100, "Reaction", "Correct", "SC06 shows crying and sadness.", "-", "reaction"],
    ["C", "Angry", "NO", 40, "Reaction", "Adjacent negative emotion", "Recognizes negative feeling but labels it too strongly.", "Emotion differentiation", "reaction"],
    ["D", "Surprised", "NO", 20, "Reaction", "Early-event emotion", "Confuses surprise with later sadness.", "Scene emotion mapping", "reaction"],
], "reaction", "OG0021_SC06_I.png")

make_option_sheet("Q05 — Thought Bubble | Story Grammar: Internal Response", "Q05_INTERNAL", "Put Milo's thought in the bubble.", [
    ["A", "Everyone has a color but me.", "YES", 100, "Internal Response", "Correct", "Captures Milo's inner comparison and loneliness.", "-", "internal_response"],
    ["B", "I want to play with butterflies.", "NO", 20, "Attempt detail", "Confuses action context with inner thought.", "Thought/action confusion", "attempt"],
    ["C", "I am the fastest chameleon.", "NO", 0, "Unrelated self-belief", "Opposite of the vulnerable internal state.", "Guessing / no inference", "internal_response"],
    ["D", "The pond is very blue.", "NO", 50, "Surface observation", "Sees visual detail but not internal state.", "Surface-level inference", "internal_response"],
], "internal_response", "OG0021_SC06_I.png")

ws = wb.create_sheet("Q06_CONSEQUENCE")
set_widths(ws, [8, 26, 20, 14, 24, 32, 20, 24])
merge_title(ws, "A1:H1", "Q06 — Cause→Result Chain | Story Grammar: Consequence")
ws.merge_cells("A2:H2")
style_cell(ws["A2"], C_YELLOW, True).value = "Question: Make the cause and result chain."
for i, h in enumerate(["Slot", "Correct Card", "Slot Weight", "Max Points", "Distractors", "Weight Rationale", "Error Tag", "LRS"], 1):
    header(ws, 4, i, h)
rows = [
    ["Cause", "Milo cries by the pond.", 45, "=C5/SUM($C$5:$C$6)*100", "The butterfly turns gray.", "Identifies the action/event that triggers the result.", "wrong_cause", "consequence"],
    ["Result", "His colors come back.", 55, "=C6/SUM($C$5:$C$6)*100", "Milo stays gray forever.", "Result is the core consequence and receives slightly higher weight.", "wrong_result", "consequence"],
]
for r, row in enumerate(rows, 5):
    for c, v in enumerate(row, 1):
        style_cell(ws.cell(r, c, v), C_YELLOW if r == 5 else C_GREEN)
for c, v in [(1, "TOTAL"), (3, "=SUM(C5:C6)"), (4, "=SUM(D5:D6)")]:
    style_cell(ws.cell(7, c, v), C_ACCENT, True, "000000", 9, "center")

make_option_sheet("Q07 — Synthesis MCQ | Main Idea / Whole Story Meaning", "Q07_SYNTHESIS", "What did Milo find out at the end?", [
    ["A", "Colors keep you safe.", "NO", 10, "Synthesis", "Fact distractor", "Treats an animal fact as the story meaning.", "Theme/detail confusion", "synthesis"],
    ["B", "Friends always help you.", "NO", 30, "Synthesis", "Partial action theme", "Over-focuses on help/action rather than self-discovery.", "Partial theme", "synthesis"],
    ["C", "Your color is inside you.", "YES", 100, "Synthesis", "Correct", "Synthesizes the story's whole meaning.", "-", "synthesis"],
    ["D", "The world has many colors.", "NO", 20, "Synthesis", "Setting detail", "Chooses atmosphere/background over theme.", "Detail/theme confusion", "synthesis"],
], "synthesis")

# SG_SCORING
ws = wb.create_sheet("SG_SCORING")
set_widths(ws, [18, 14, 18, 28, 34, 30, 28])
merge_title(ws, "A1:G1", "Story Grammar Scoring Model — v2")
for i, h in enumerate(["Axis", "Q_ID", "Score Source", "Calculation", "Interpretation", "Parent Report Use", "Weekly Rollup"], 1):
    header(ws, 3, i, h)
axes = [
    ["Setting", "Q01", "setting_score", "component weighted score", "Understands initial time/place/situation.", "Radar axis 1", "weighted average by story level"],
    ["Initiating Event", "Q02", "initiating_event_score", "option score", "Understands what started the problem.", "Radar axis 2", "weighted average by story level"],
    ["Attempt", "Q03", "attempt_score", "weighted word sequence", "Understands what the character does to solve the problem.", "Radar axis 3", "weighted average by story level"],
    ["Reaction", "Q04", "reaction_score", "option score", "Understands visible feeling/response.", "Radar axis 4", "weighted average by story level"],
    ["Internal Response", "Q05", "internal_response_score", "thought-card score", "Infers thoughts, motive, inner state.", "Radar axis 5", "weighted average by story level"],
    ["Consequence", "Q06", "consequence_score", "cause/result component score", "Understands result and event development.", "Radar axis 6", "weighted average by story level"],
    ["Synthesis", "Q07", "synthesis_score", "option score", "Synthesizes whole-story meaning.", "Separate card; not in radar", "20% of overall reading score"],
]
for r, row in enumerate(axes, 4):
    for c, v in enumerate(row, 1):
        style_cell(ws.cell(r, c, v), C_YELLOW if c == 1 else None)
ws.merge_cells("A13:G13")
style_cell(ws["A13"], C_GREEN, True).value = "Overall Reading Score = average(6 Story Grammar axes) × 0.8 + Synthesis × 0.2"

# LRS_MAPPING
ws = wb.create_sheet("LRS_MAPPING")
set_widths(ws, [8, 20, 30, 24, 16, 16, 30, 34])
merge_title(ws, "A1:H1", "LRS xAPI Mapping — OG0021 v2")
for i, h in enumerate(["Q_ID", "xAPI Verb", "xAPI Object", "result.sg_element", "score_raw", "correct", "Extra Fields", "Risk Signal"], 1):
    header(ws, 2, i, h)
for r, row in enumerate([
    ["Q01", "answered", "quiz_OG0021_v2_Q01_setting", "setting", "0-100", "partial", "slot_values, component_scores", "Setting gap if <70"],
    ["Q02", "answered", "quiz_OG0021_v2_Q02_initiating_event", "initiating_event", "0-100", "true/false", "option_selected, audio_src", "Initiating event gap if <70"],
    ["Q03", "answered", "quiz_OG0021_v2_Q03_attempt", "attempt", "0-100", "partial", "word_order, word_scores", "Attempt/action gap if <70"],
    ["Q04", "answered", "quiz_OG0021_v2_Q04_reaction", "reaction", "0-100", "true/false", "option_selected", "Reaction/emotion gap if <70"],
    ["Q05", "answered", "quiz_OG0021_v2_Q05_internal_response", "internal_response", "0-100", "true/false", "thought_selected", "Inference gap if <70"],
    ["Q06", "answered", "quiz_OG0021_v2_Q06_consequence", "consequence", "0-100", "partial", "cause_card,result_card", "Consequence gap if <70"],
    ["Q07", "answered", "quiz_OG0021_v2_Q07_synthesis", "synthesis", "0-100", "true/false", "option_selected", "Synthesis gap if <70"],
], 3):
    for c, v in enumerate(row, 1):
        style_cell(ws.cell(r, c, v), C_YELLOW if c == 1 else None)

for ws in wb.worksheets:
    ws.sheet_view.showGridLines = False

wb.save(OUT)
print(f"Saved {OUT}")
