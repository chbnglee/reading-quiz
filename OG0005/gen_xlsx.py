"""
OG0005_ReadingQuiz.xlsx generator
Structure mirrors OG0021_ReadingQuiz.xlsx:
  QUIZ_LIST / Q01_SEQUENCING / Q02_SENT_MATCH / Q03_UNSCRAMBLE /
  Q04_EMOTION / Q05_CHAR_GOAL / Q06_MAIN_IDEA / SCORING_RULES / LRS_MAPPING
"""
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

wb = openpyxl.Workbook()

# ── Style helpers ────────────────────────────────────────
PURPLE    = PatternFill('solid', fgColor='7C3AED')
LT_PURPLE = PatternFill('solid', fgColor='F5F3FF')
GOLD      = PatternFill('solid', fgColor='FEF3C7')
GREEN     = PatternFill('solid', fgColor='ECFDF5')
RED_LT    = PatternFill('solid', fgColor='FEF2F2')
GRAY_LT   = PatternFill('solid', fgColor='F9FAFB')
BLUE_LT   = PatternFill('solid', fgColor='DBEAFE')
ORANGE_LT = PatternFill('solid', fgColor='FFEDD5')

W_FONT  = Font(bold=True, color='FFFFFF', name='Calibri', size=11)
HD_FONT = Font(bold=True, color='FFFFFF', name='Calibri', size=10)
TL_FONT = Font(bold=True, color='7C3AED', name='Calibri', size=12)
SC_FONT = Font(bold=True, color='065F46', name='Calibri', size=10)
ER_FONT = Font(bold=True, color='991B1B', name='Calibri', size=10)
BK_FONT = Font(color='4B5563', name='Calibri', size=10)
thin    = Side(style='thin', color='C4B5FD')
BORDER  = Border(left=thin, right=thin, top=thin, bottom=thin)
WRAP    = Alignment(wrap_text=True, vertical='top')
CENTER  = Alignment(horizontal='center', vertical='center', wrap_text=True)

def hdr(ws, row, col, val, fill=PURPLE, font=HD_FONT):
    c = ws.cell(row, col, val); c.fill = fill; c.font = font
    c.alignment = CENTER; c.border = BORDER; return c

def cell(ws, row, col, val, fill=None, font=None, align=WRAP, bold=False):
    c = ws.cell(row, col, val)
    if fill:  c.fill  = fill
    if font:  c.font  = font
    elif bold: c.font = Font(bold=True, name='Calibri', size=10)
    else:      c.font = BK_FONT
    c.alignment = align; c.border = BORDER; return c

def title_row(ws, row, text, fill=LT_PURPLE):
    c = ws.cell(row, 1, text); c.fill = fill; c.font = TL_FONT
    c.alignment = Alignment(wrap_text=True, vertical='center')
    return c

def section(ws, row, text):
    c = ws.cell(row, 1, text)
    c.fill = PatternFill('solid', fgColor='EDE9FE')
    c.font = Font(bold=True, color='5B21B6', name='Calibri', size=10)
    c.alignment = WRAP; c.border = BORDER; return c

def set_cols(ws, widths):
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w

def alt(row): return LT_PURPLE if row % 2 == 0 else None

# ════════════════════════════════════════════════════════
# QUIZ_LIST
# ════════════════════════════════════════════════════════
ws = wb.active; ws.title = 'QUIZ_LIST'
title_row(ws, 1, 'OG0005 Reading Quiz — Master List (Podo and Didi)')
ws.merge_cells('A1:J1')

cols = ['Q_ID','Quiz Type','Story Grammar Element','Question (EN)',
        'Scene Ref','Answer Sheet','Max Score','LRS sg_element','Scoring Mode','Sheet Ref']
for c, h in enumerate(cols, 1): hdr(ws, 2, c, h)

rows = [
    ['Q01','Scene Sequencing','Setting→IE→Attempt→Consequence→Resolution',
     'Put the 5 scenes in story order.',
     'SC02/SC03/SC05/SC07/SC12','SC02-SC03-SC05-SC07-SC12','100',
     'setting,initiating_event,attempt,consequence,resolution','Weighted Position','Q01_SEQUENCING'],
    ['Q02','Sentence-Scene Match','Initiating Event',
     'Listen and choose the matching scene.',
     'SC03/SC02/SC05/SC09','SC02','100',
     'initiating_event','Weighted MCQ','Q02_SENT_MATCH'],
    ['Q03','Sentence Unscramble','Attempt',
     'Put the words in order to make a sentence.',
     '-','By trapping it, you extinguished its light.','100',
     'attempt','Weighted Unscramble','Q03_UNSCRAMBLE'],
    ['Q04','Emotion Identification','Reaction / Internal Response',
     'How does Didi feel in this scene?',
     'SC08','Option B','100',
     'reaction','Weighted MCQ','Q04_EMOTION'],
    ['Q05','Character Goal MCQ','Initiating Event / Goal',
     'What does Didi want at the start of the story?',
     '-','Option A','100',
     'initiating_event','Weighted MCQ','Q05_CHAR_GOAL'],
    ['Q06','Main Idea MCQ','Theme / Resolution',
     'What lesson did Didi learn from this experience?',
     '-','Option B','100',
     'theme','Weighted MCQ','Q06_MAIN_IDEA'],
]
for r, row in enumerate(rows, 3):
    for c, v in enumerate(row, 1):
        cell(ws, r, c, v, fill=alt(r))

note = ws.cell(10, 1, 'Each question sheet defines per-option/position scores and weights. The HTML file reads this workbook via SheetJS to render the live quiz.')
note.font = Font(italic=True, color='6B7280', name='Calibri', size=9)
note.alignment = Alignment(wrap_text=True)
ws.merge_cells('A10:J10')

set_cols(ws, [6,22,36,46,20,32,10,42,20,16])
ws.row_dimensions[1].height = 22; ws.row_dimensions[2].height = 30

# ════════════════════════════════════════════════════════
# Q01_SEQUENCING
# ════════════════════════════════════════════════════════
ws = wb.create_sheet('Q01_SEQUENCING')
title_row(ws, 1, 'Q01 — Scene Sequencing | Story Grammar: Full Arc')
ws.merge_cells('A1:J1')
cell(ws, 2, 1, 'Question: Put the 5 scene images in the correct story order by dragging them into position.')
ws.merge_cells('A2:J2')
cell(ws, 3, 1, 'Scenes provided:  OG0005_SC02_I  |  OG0005_SC03_I  |  OG0005_SC05_I  |  OG0005_SC07_I  |  OG0005_SC12_I')
ws.merge_cells('A3:J3')
cell(ws, 4, 1, 'Correct Answer: SC02 → SC03 → SC05 → SC07 → SC12')
ws.merge_cells('A4:J4')
cell(ws, 5, 1, 'Story Grammar: SC02=Initiating Event (cloud appears) | SC03=1st Observation (Didi notices) | SC05=Attempt (captures cloud) | SC07=Consequence (cloud turns gray) | SC12=Resolution (cloud freed)')
ws.merge_cells('A5:J5')

section(ws, 6, 'SECTION A — Position Weight per Scene')
ws.merge_cells('A6:J6')

hdr_a = ['Scene Asset','Correct Pos','Story Grammar Role','Position Weight','Weight Rationale','Max Points']
for c, h in enumerate(hdr_a, 1): hdr(ws, 7, c, h)

# weights: SC02=2.5, SC03=1.5, SC05=1.5, SC07=1.5, SC12=2.5  total=9.5
seq_data = [
    ['OG0005_SC02_I', 1, 'Initiating Event (rainbow cloud appears)', 2.5,
     'Unambiguous opening event. Placing wrong = cannot identify story trigger.',
     '=D9/SUM($D$9:$D$13)*100'],
    ['OG0005_SC03_I', 2, '1st Observation (Didi notices cloud)', 1.5,
     'Clear observation scene; SC03/SC05 confusion is forgivable — both mid-story.',
     '=D10/SUM($D$9:$D$13)*100'],
    ['OG0005_SC05_I', 3, 'Attempt (Didi captures cloud)', 1.5,
     'Action scene similar to SC03; mixing these two penalized less.',
     '=D11/SUM($D$9:$D$13)*100'],
    ['OG0005_SC07_I', 4, 'Consequence (cloud turns gray)', 1.5,
     'Consequence scene; close to SC05 thematically — smaller penalty for adjacency.',
     '=D12/SUM($D$9:$D$13)*100'],
    ['OG0005_SC12_I', 5, 'Resolution (cloud freed, colors return)', 2.5,
     'Unambiguous final scene. Placing wrong = fundamental arc gap.',
     '=D13/SUM($D$9:$D$13)*100'],
]
for r, row in enumerate(seq_data, 9):
    for c, v in enumerate(row, 1):
        fill = GREEN if c == 6 else alt(r)
        cell(ws, r, c, v, fill=fill)
# TOTAL row
cell(ws, 14, 1, 'TOTAL', bold=True)
ws.cell(14, 4, '=SUM(D9:D13)').font = Font(bold=True, name='Calibri', size=10)
ws.cell(14, 6, '=SUM(F9:F13)').font = Font(bold=True, name='Calibri', size=10)
ws.cell(14, 4).border = BORDER; ws.cell(14, 6).border = BORDER
ws.cell(14, 4).fill = GOLD; ws.cell(14, 6).fill = GOLD

section(ws, 15, 'SECTION B — Score Matrix: Points per (Scene, Submitted Position)')
ws.merge_cells('A15:J15')

hdr_b = ['Scene \\ Submitted Pos','Pos 1','Pos 2','Pos 3','Pos 4','Pos 5']
for c, h in enumerate(hdr_b, 1): hdr(ws, 16, c, h)

# score = weight * max(0, 1 - |placed - correct| * 0.5) / 9.5 * 100
# SC02(pos1,2.5), SC03(pos2,1.5), SC05(pos3,1.5), SC07(pos4,1.5), SC12(pos5,2.5)
matrix = [
    ['OG0005_SC02_I', 26.3, 13.2, 0, 0, 0],
    ['OG0005_SC03_I', 7.9, 15.8, 7.9, 0, 0],
    ['OG0005_SC05_I', 0, 7.9, 15.8, 7.9, 0],
    ['OG0005_SC07_I', 0, 0, 7.9, 15.8, 7.9],
    ['OG0005_SC12_I', 0, 0, 0, 13.2, 26.3],
]
for r, row in enumerate(matrix, 17):
    for c, v in enumerate(row, 1):
        fill = GREEN if (c > 1 and float(v) > 20) else (GOLD if (c > 1 and float(v) > 0) else alt(r))
        cell(ws, r, c, v, fill=fill)

section(ws, 22, 'SECTION C — Example Answer Scores')
ws.merge_cells('A22:J22')

hdr_c = ['Example Student Answer','Submitted Order','Score','Interpretation']
for c, h in enumerate(hdr_c, 1): hdr(ws, 23, c, h)

examples = [
    ['Perfect',               'SC02-SC03-SC05-SC07-SC12', 100, 'Full story arc understood'],
    ['SC05/SC07 swapped',     'SC02-SC03-SC07-SC05-SC12', 79,  'Adjacent attempt/consequence swap — mild penalty'],
    ['Middle scrambled',      'SC02-SC07-SC05-SC03-SC12', 53,  'Anchor scenes correct; internal sequence weak'],
    ['Beginning/end wrong',   'SC03-SC02-SC12-SC07-SC05', 28,  'Story arc fundamentally misunderstood'],
]
for r, row in enumerate(examples, 24):
    fills = [GREEN if row[2]==100 else (GOLD if row[2]>=60 else (ORANGE_LT if row[2]>=30 else RED_LT))]
    for c, v in enumerate(row, 1):
        fill = fills[0]
        cell(ws, r, c, v, fill=fill)

lrs = ws.cell(28, 1, 'LRS: verb="answered" | object="quiz_OG0005_Q01_sequencing" | result.sg_element="setting,initiating_event,attempt,consequence,resolution" | result.sequence_submitted=[] | result.score_raw=<n> | result.position_scores={}')
lrs.font = Font(italic=True, color='6B7280', name='Calibri', size=9); lrs.alignment = Alignment(wrap_text=True)
ws.merge_cells('A28:J28')

set_cols(ws, [18,10,34,14,50,12,12,12,12,12])

# ════════════════════════════════════════════════════════
# Q02_SENT_MATCH
# ════════════════════════════════════════════════════════
ws = wb.create_sheet('Q02_SENT_MATCH')
title_row(ws, 1, 'Q02 — Sentence-Scene Match | Story Grammar: Initiating Event')
ws.merge_cells('A1:I1')
cell(ws, 2, 1, 'Question: Listen to the sentence. Which scene image does this sentence come from?')
ws.merge_cells('A2:I2')
cell(ws, 3, 1, 'Target Sentence (SC02_ST01_N): "But look! A rainbow stardust cloud is drifting close to Tiny Rock!"')
ws.merge_cells('A3:I3')
cell(ws, 3, 1, ws.cell(3,1).value, fill=BLUE_LT)
cell(ws, 4, 1, 'audio_src: Audio/OG0005_SC02_ST01_N_A.mp3')
ws.merge_cells('A4:I4')

hdr_cols = ['Option','Scene Image','Scene Description','Correct?','Score',
            'Story Grammar Role','Distractor Rationale','Weakness Signal','LRS sg_element']
for c, h in enumerate(hdr_cols, 1): hdr(ws, 5, c, h)

q2_data = [
    ['A','OG0005_SC03_I','Didi observes the cloud closely','NO',25,'Attempt (observation)',
     'SC03 is immediately after SC02 — easy to confuse as "the cloud scene"',
     'Identifies cloud context but cannot pinpoint the exact initiating moment','attempt'],
    ['B','OG0005_SC02_I','Rainbow stardust cloud drifts toward Tiny Rock','YES',100,'Initiating Event',
     '—','—','initiating_event'],
    ['C','OG0005_SC05_I','Didi traps the cloud in a jar','NO',15,'Attempt (capture)',
     'Also involves cloud but is the action scene — confuses problem with attempt',
     'Understands cloud is central; cannot map sentence to specific moment','attempt'],
    ['D','OG0005_SC09_I','Podo explains to Didi about light','NO',5,'Consequence / Turning Point',
     'Completely different scene; student likely guessing',
     'No literal comprehension of the sentence','consequence'],
]
for r, row in enumerate(q2_data, 6):
    fill = GREEN if row[3]=='YES' else alt(r)
    for c, v in enumerate(row, 1):
        f = GREEN if row[3]=='YES' else (RED_LT if c==5 and isinstance(v,int) and v<20 else alt(r))
        cell(ws, r, c, v, fill=f)

lrs = ws.cell(10, 1, 'LRS: verb="answered" | object="quiz_OG0005_Q02_sent_match" | result.sg_element="initiating_event" | result.option_selected=<A/B/C/D> | result.score_raw=<n>')
lrs.font = Font(italic=True, color='6B7280', name='Calibri', size=9); lrs.alignment = Alignment(wrap_text=True)
ws.merge_cells('A10:I10')

set_cols(ws, [8,18,38,10,8,24,44,44,18])

# ════════════════════════════════════════════════════════
# Q03_UNSCRAMBLE
# ════════════════════════════════════════════════════════
ws = wb.create_sheet('Q03_UNSCRAMBLE')
title_row(ws, 1, 'Q03 — Sentence Unscramble | Story Grammar: Attempt')
ws.merge_cells('A1:I1')
cell(ws, 2, 1, 'Question: The words below are mixed up. Drag them into the correct order to make a sentence.')
ws.merge_cells('A2:I2')
cell(ws, 3, 1, 'Source: SC05 narration  |  Correct: "By trapping it, you extinguished its light."')
ws.merge_cells('A3:I3')
cell(ws, 3, 1, ws.cell(3,1).value, fill=BLUE_LT)
cell(ws, 4, 1, 'Scrambled tokens presented to student: [ By ] [ trapping ] [ it, ] [ you ] [ extinguished ] [ its ] [ light. ]  (7 tokens — Level 2)')
ws.merge_cells('A4:I4')

section(ws, 5, 'SECTION A — Per-Word Position Weight')
ws.merge_cells('A5:I5')

hdr_w = ['Word Token','Correct Pos','Grammatical Role','Word Weight','Weight Rationale','Max Points','Cumulative']
for c, h in enumerate(hdr_w, 1): hdr(ws, 6, c, h)

# weights: By=1.5, trapping=2.5, it,=1.0, you=1.5, extinguished=2.5, its=1.5, light.=2.0  total=12.5
word_data = [
    ['By',           1, 'Preposition (adverbial clause opener)',    1.5,
     'Marks adverbial structure; wrong placement = cannot parse complex sentence opener',
     '=D8/SUM($D$8:$D$14)*100',  '=F8'],
    ['trapping',     2, 'Gerund / main verb of subordinate clause', 2.5,
     'High-value academic verb; core meaning word — misplacing = semantic breakdown',
     '=D9/SUM($D$8:$D$14)*100',  '=F8+F9'],
    ['it,',          3, 'Object pronoun of subordinate clause',     1.0,
     'Shortest/lightest token; confusion here is forgivable — function word',
     '=D10/SUM($D$8:$D$14)*100', '=F8+F9+F10'],
    ['you',          4, 'Subject of main clause',                   1.5,
     'Pronoun subject; swapping with "its" = pronoun case confusion',
     '=D11/SUM($D$8:$D$14)*100', '=F8+F9+F10+F11'],
    ['extinguished', 5, 'Main verb (past tense, high-level vocab)', 2.5,
     'Highest-difficulty word; correct placement shows vocabulary + syntax mastery',
     '=D12/SUM($D$8:$D$14)*100', '=F8+F9+F10+F11+F12'],
    ['its',          6, 'Possessive pronoun (modifying "light")',   1.5,
     'Determiner; swapping with "you" = common pronoun confusion',
     '=D13/SUM($D$8:$D$14)*100', '=F8+F9+F10+F11+F12+F13'],
    ['light.',       7, 'Object noun / sentence closer',            2.0,
     'Closing content word; missing = incomplete predicate understanding',
     '=D14/SUM($D$8:$D$14)*100', '=SUM(F8:F14)'],
]
for r, row in enumerate(word_data, 8):
    for c, v in enumerate(row, 1):
        fill = GREEN if c == 6 else alt(r)
        cell(ws, r, c, v, fill=fill)
cell(ws, 15, 1, 'TOTAL', bold=True)
ws.cell(15, 4, '=SUM(D8:D14)').font = Font(bold=True, name='Calibri', size=10); ws.cell(15, 4).border=BORDER; ws.cell(15, 4).fill=GOLD
ws.cell(15, 6, '=SUM(F8:F14)').font = Font(bold=True, name='Calibri', size=10); ws.cell(15, 6).border=BORDER; ws.cell(15, 6).fill=GOLD
ws.cell(15, 7, '100 check').font = Font(bold=True, name='Calibri', size=10);    ws.cell(15, 7).border=BORDER; ws.cell(15, 7).fill=GOLD

section(ws, 16, 'SECTION B — Partial Score Examples')
ws.merge_cells('A16:I16')

hdr_e = ['Student Answer','Correct Positions','Score','Weakness Signal']
for c, h in enumerate(hdr_e, 1): hdr(ws, 17, c, h)

ex_data = [
    ['By trapping it, you extinguished its light.',      '7/7', 100, '—'],
    ['By trapping it, you extinguished light. its',       '6/7 (its/light swapped)',    84, 'Possessive determiner closing structure'],
    ['By trapping it, its you extinguished light.',       '4/7 (pronoun confusion)',    52, 'Pronoun + verb-object ordering'],
    ['trapping By it, you extinguished its light.',       '5/7 (By/trapping swapped)',  68, 'Adverbial clause opener syntax'],
    ['you extinguished its light. By trapping it,',       '2/7 (clauses reversed)',     28, 'Complex sentence clause ordering'],
    ['light. its extinguished you it, trapping By',       '0/7',                         0, 'No syntactic understanding; likely guessing'],
]
for r, row in enumerate(ex_data, 18):
    score = row[2]
    fill = GREEN if score==100 else (GOLD if score>=60 else (ORANGE_LT if score>=30 else RED_LT))
    for c, v in enumerate(row, 1):
        cell(ws, r, c, v, fill=fill)

lrs = ws.cell(24, 1, 'LRS: verb="answered" | object="quiz_OG0005_Q03_unscramble" | result.sg_element="attempt" | result.word_order_submitted=[] | result.score_raw=<n> | result.words_correct=<n>/7')
lrs.font = Font(italic=True, color='6B7280', name='Calibri', size=9); lrs.alignment = Alignment(wrap_text=True)
ws.merge_cells('A24:I24')

set_cols(ws, [16,10,36,12,52,12,12,12,12])

# ════════════════════════════════════════════════════════
# Q04_EMOTION
# ════════════════════════════════════════════════════════
ws = wb.create_sheet('Q04_EMOTION')
title_row(ws, 1, 'Q04 — Emotion Identification MCQ | Story Grammar: Reaction / Internal Response')
ws.merge_cells('A1:I1')
cell(ws, 2, 1, 'Question: Look at scene SC08. How does Didi feel in this scene?')
ws.merge_cells('A2:I2')
cell(ws, 3, 1, 'Source: SC08 — Didi sees the rainbow cloud has turned completely gray in the jar.  Emotion = Disappointed / Sad')
ws.merge_cells('A3:I3')
cell(ws, 3, 1, ws.cell(3,1).value, fill=ORANGE_LT)

hdr_cols = ['Option','Option Text','Correct?','Score','Story Grammar Role',
            'Distractor Type','Distractor Rationale','Weakness Signal','LRS sg_element']
for c, h in enumerate(hdr_cols, 1): hdr(ws, 4, c, h)

q4_data = [
    ['A','Frustrated','NO',50,'Internal Response (near-miss)',
     'Adjacent negative emotion','Recognizes negative valence but misreads intensity level — frustration implies blocked goal, disappointment implies lost hope',
     'Emotion at valence level only; cannot distinguish frustrated vs disappointed','internal_response'],
    ['B','Disappointed','YES',100,'Reaction / Internal Response',
     'Correct','SC08 emotion confirmed — cloud turned gray, hope lost','—','reaction'],
    ['C','Happy','NO',0,'Internal Response mismatch',
     'Opposite emotion','Confuses resolution scene emotion with SC08','Cannot map emotions to specific moments; temporal confusion','internal_response'],
    ['D','Shocked','NO',20,'Surface reaction read',
     'Initial reaction distractor','Shock is momentary; disappointed is sustained — student reads surface not depth',
     'Reads immediate facial cue; misses sustained emotional state','reaction'],
]
for r, row in enumerate(q4_data, 5):
    fill = GREEN if row[2]=='YES' else alt(r)
    for c, v in enumerate(row, 1):
        cell(ws, r, c, v, fill=fill)

lrs = ws.cell(9, 1, 'LRS: verb="answered" | object="quiz_OG0005_Q04_emotion" | result.sg_element="reaction" | result.option_selected=<A/B/C/D> | result.score_raw=<n> | result.semantic_distance=<0.0-1.0>')
lrs.font = Font(italic=True, color='6B7280', name='Calibri', size=9); lrs.alignment = Alignment(wrap_text=True)
ws.merge_cells('A9:I9')

set_cols(ws, [8,18,10,8,24,22,50,48,18])

# ════════════════════════════════════════════════════════
# Q05_CHAR_GOAL
# ════════════════════════════════════════════════════════
ws = wb.create_sheet('Q05_CHAR_GOAL')
title_row(ws, 1, 'Q05 — Character Goal MCQ | Story Grammar: Initiating Event / Goal')
ws.merge_cells('A1:I1')
cell(ws, 2, 1, 'Question: What does Didi want at the start of the story?')
ws.merge_cells('A2:I2')
cell(ws, 3, 1, 'Didi\'s goal: To capture and keep a piece of the rainbow stardust cloud (SC02-SC05 arc).')
ws.merge_cells('A3:I3')
cell(ws, 3, 1, ws.cell(3,1).value, fill=BLUE_LT)

hdr_cols = ['Option','Option Text','Correct?','Score','Story Grammar Role',
            'Distractor Type','Distractor Rationale','Weakness Signal','LRS sg_element']
for c, h in enumerate(hdr_cols, 1): hdr(ws, 4, c, h)

q5_data = [
    ['A','To capture a piece of the rainbow cloud.','YES',100,'Initiating Event / Goal',
     'Correct','—','—','initiating_event'],
    ['B','To travel across the universe with Podo.','NO',0,'Unrelated detail',
     'Wild distractor','Podo is present but travel is never a stated goal',
     'Random selection or no character goal understanding','—'],
    ['C','To share the cloud\'s beauty with friends.','NO',20,'Goal misread (altruistic reframe)',
     'Partial goal','Student softens Didi\'s selfish possession drive into sharing',
     'Cannot distinguish "keep for self" from "share" — moral reframing of goal','initiating_event'],
    ['D','To learn why stardust clouds glow.','NO',10,'Curiosity misread',
     'Cognitive distractor','Interprets action as scientific curiosity rather than possessive desire',
     'Reads surface behavior not character motivation; inferencing gap','initiating_event'],
]
for r, row in enumerate(q5_data, 5):
    fill = GREEN if row[2]=='YES' else alt(r)
    for c, v in enumerate(row, 1):
        cell(ws, r, c, v, fill=fill)

lrs = ws.cell(9, 1, 'LRS: verb="answered" | object="quiz_OG0005_Q05_char_goal" | result.sg_element="initiating_event" | result.option_selected=<A/B/C/D> | result.score_raw=<n>')
lrs.font = Font(italic=True, color='6B7280', name='Calibri', size=9); lrs.alignment = Alignment(wrap_text=True)
ws.merge_cells('A9:I9')

set_cols(ws, [8,50,10,8,24,22,46,50,18])

# ════════════════════════════════════════════════════════
# Q06_MAIN_IDEA
# ════════════════════════════════════════════════════════
ws = wb.create_sheet('Q06_MAIN_IDEA')
title_row(ws, 1, 'Q06 — Main Idea MCQ | Story Grammar: Theme / Resolution')
ws.merge_cells('A1:I1')
cell(ws, 2, 1, 'Question: What lesson did Didi learn from this experience?')
ws.merge_cells('A2:I2')
cell(ws, 3, 1, 'Theme: True beauty exists in freedom and the natural world — capturing it destroys what makes it beautiful. (SC12 resolution arc)')
ws.merge_cells('A3:I3')
cell(ws, 3, 1, ws.cell(3,1).value, fill=BLUE_LT)

hdr_cols = ['Option','Option Text','Correct?','Score','Story Grammar Role',
            'Distractor Type','Distractor Rationale','Weakness Signal','LRS sg_element']
for c, h in enumerate(hdr_cols, 1): hdr(ws, 4, c, h)

q6_data = [
    ['A','Stardust clouds are made of beautiful colors.','NO',10,'Setting detail',
     'Literal distractor','Takes visual/factual description as message; reading at surface level',
     'Cannot abstract theme from plot; literal reading only','setting'],
    ['B','True beauty belongs to the open sky, not a shelf.','YES',100,'Theme / Resolution',
     'Correct','Correctly captures freedom-vs-possession arc from SC05 through SC12','—','theme'],
    ['C','It is important to always listen to your friend\'s advice.','NO',20,'Attempt / Relationship misread',
     'Partial theme (process focus)','Podo gives advice which Didi ignores — student focuses on the interpersonal lesson not the deeper beauty/freedom theme',
     'Mid-level comprehension; identifies supporting lesson not central theme','attempt'],
    ['D','Capturing rare things is a way to keep their beauty forever.','NO',0,'Anti-theme',
     'Opposite meaning','Directly contradicts the story\'s message — student may not have processed the consequence arc',
     'No thematic understanding; possibly read only first half of story','—'],
]
for r, row in enumerate(q6_data, 5):
    fill = GREEN if row[2]=='YES' else alt(r)
    for c, v in enumerate(row, 1):
        cell(ws, r, c, v, fill=fill)

lrs = ws.cell(9, 1, 'LRS: verb="answered" | object="quiz_OG0005_Q06_main_idea" | result.sg_element="theme" | result.option_selected=<A/B/C/D> | result.score_raw=<n> | result.semantic_distance=<0.0-1.0>')
lrs.font = Font(italic=True, color='6B7280', name='Calibri', size=9); lrs.alignment = Alignment(wrap_text=True)
ws.merge_cells('A9:I9')

set_cols(ws, [8,56,10,8,24,22,52,52,18])

# ════════════════════════════════════════════════════════
# SCORING_RULES
# ════════════════════════════════════════════════════════
ws = wb.create_sheet('SCORING_RULES')
title_row(ws, 1, 'Global Scoring Rules — OG0005 Reading Quiz')
ws.merge_cells('A1:G1')

section(ws, 2, 'SECTION A — Score Band Interpretation')
ws.merge_cells('A2:G2')

hdr_b = ['Band','Score Range','Color','LRS Risk Signal','SG Insight','MRI Profile Impact','Recommendation']
for c, h in enumerate(hdr_b, 1): hdr(ws, 3, c, h)

bands = [
    ['Mastery',    '85-100', 'Green',  'None',                        'Full SG element understood',       'V+/L+ in profile',           'Proceed to next level'],
    ['Developing', '60-84',  'Gold',   'Meaning Signal (mild)',        'Partial narrative understanding',   'V0 — maintain level',        'Review target scene'],
    ['Emerging',   '30-59',  'Orange', 'Meaning Signal (moderate)',    'Surface/literal only',              'V- — flag for booster',      'Assign Booster Content'],
    ['Beginning',  '0-29',   'Red',    'Meaning Signal (strong)',      'Fundamental gap; guessing',         'V-- — priority intervention','Comprehension Booster + re-read'],
]
band_fills = [GREEN, GOLD, ORANGE_LT, RED_LT]
for r, (row, fill) in enumerate(zip(bands, band_fills), 4):
    for c, v in enumerate(row, 1):
        cell(ws, r, c, v, fill=fill)

section(ws, 8, 'SECTION B — Weighting Rationale by Story Grammar Element')
ws.merge_cells('A8:G8')

hdr_sg = ['SG Element','Quiz Coverage','Why Weighted','LRS Engine','Weakness Signal if Missed']
for c, h in enumerate(hdr_sg, 1): hdr(ws, 9, c, h)

sg_data = [
    ['Setting (Tiny Rock planet)','Q01 (SC02, anchor pos 1)','Entry anchor — gate to story world and all events','Vocab & Comprehension Engine','Literal comprehension dependency'],
    ['Initiating Event / Goal','Q01 (SC03), Q02, Q05','Core problem-formation; misidentifying = no narrative schema','Vocab & Comprehension Engine','Inferencing weakness'],
    ['Attempt (cloud capture)','Q01 (SC05), Q03','Complex sentence decoding (By trapping it...); confusion = sequential processing gap','Vocab & Comprehension Engine','Semantic Decision Stability + Vocabulary gap'],
    ['Consequence / Reaction','Q01 (SC07), Q04','Emotional scene + cause-effect link — confusion = emotion inference gap','Expression Engine','Emotion inference (Expression Signal)'],
    ['Resolution (cloud freed)','Q01 (SC12, anchor pos 5), Q06','Exit anchor — without this, theme extraction fails','Vocab & Comprehension Engine','Inferencing / Story Transfer weakness'],
    ['Theme','Q06','Highest-order comprehension — requires abstract reasoning beyond literal events','V&C Engine + Expression Engine','Limited reasoning (Expression Signal)'],
    ['Internal Response (Emotion)','Q04','Moment-level emotion mapping at advanced vocabulary level','Expression Engine','Perspective taking + emotion vocabulary weakness'],
]
for r, row in enumerate(sg_data, 10):
    for c, v in enumerate(row, 1):
        cell(ws, r, c, v, fill=alt(r))

section(ws, 17, 'SECTION C — MRI Profile Contribution')
ws.merge_cells('A17:G17')
note1 = ws.cell(18, 1, 'Quiz scores feed into Vocabulary & Comprehension Engine (V-score) and partially Expression Engine (L-score).')
note1.font = BK_FONT; note1.alignment = WRAP; ws.merge_cells('A18:G18')
note2 = ws.cell(19, 1, 'Parent Report (3-tier): Level (e.g. Lv4 — Vocabulary Retrieval) | Detail Profile: P3/V1/L2 | Risk Points: Inferencing weakness / Emotion identification gap')
note2.font = BK_FONT; note2.alignment = WRAP; ws.merge_cells('A19:G19')

section(ws, 20, 'SECTION D — Q03 Complexity Note (Level 2)')
ws.merge_cells('A20:G20')
note3 = ws.cell(21, 1, 'OG0005 Q03 uses a 7-word adverbial-clause sentence ("By trapping it, you extinguished its light.") vs OG0021\'s 5-word simple sentence. This reflects Level 2 complexity. Scoring uses weighted_sequence across 7 positions; total weight = 12.5. Academic verb "extinguished" and gerund "trapping" carry highest weights (2.5 each).')
note3.font = BK_FONT; note3.alignment = WRAP; ws.merge_cells('A21:G21')

set_cols(ws, [24,34,46,28,32,24,36])

# ════════════════════════════════════════════════════════
# LRS_MAPPING
# ════════════════════════════════════════════════════════
ws = wb.create_sheet('LRS_MAPPING')
title_row(ws, 1, 'LRS xAPI Mapping — OG0005 Quiz Statements')
ws.merge_cells('A1:H1')

hdr_cols = ['Q_ID','xAPI Verb','xAPI Object','result.sg_element',
            'result.score_raw','result.correct','Extra Fields','Risk Signal']
for c, h in enumerate(hdr_cols, 1): hdr(ws, 2, c, h)

lrs_data = [
    ['Q01','answered','quiz_OG0005_Q01_sequencing',
     'setting,initiating_event,attempt,consequence,resolution',
     '0-100','partial','sequence_submitted[], position_scores{}','Meaning Signal if <60'],
    ['Q02','answered','quiz_OG0005_Q02_sent_match',
     'initiating_event','0-100','true/false',
     'option_selected, response_latency_ms','Meaning Signal if option!=B'],
    ['Q03','answered','quiz_OG0005_Q03_unscramble',
     'attempt','0-100','partial',
     'word_order_submitted[], words_correct/7','Meaning Signal if <60'],
    ['Q04','answered','quiz_OG0005_Q04_emotion',
     'reaction','0-100','true/false',
     'option_selected, semantic_distance','Expression Signal if <40 (emotion inference)'],
    ['Q05','answered','quiz_OG0005_Q05_char_goal',
     'initiating_event','0-100','true/false',
     'option_selected, response_latency_ms','Meaning Signal if option!=A'],
    ['Q06','answered','quiz_OG0005_Q06_main_idea',
     'theme','0-100','true/false',
     'option_selected, semantic_distance','Expression Signal if <30 (limited reasoning)'],
]
for r, row in enumerate(lrs_data, 3):
    for c, v in enumerate(row, 1):
        cell(ws, r, c, v, fill=alt(r))

note = ws.cell(9, 1, 'Single LRS storage (xAPI). V&C Engine reads sg_element + score_raw for Q01-Q05. Expression Engine reads Q04/Q06 semantic_distance. MRI report: V-level (Q01-Q05) + L-level (Q04, Q06).')
note.font = Font(italic=True, color='6B7280', name='Calibri', size=9); note.alignment = WRAP
ws.merge_cells('A9:H9')

set_cols(ws, [6,12,32,44,14,14,34,36])

# ════════════════════════════════════════════════════════
# Save
# ════════════════════════════════════════════════════════
out = r'C:\Users\bonni\Desktop\ISM\Content\Quiz\OG0005\OG0005_ReadingQuiz.xlsx'
wb.save(out)
print('Saved:', out)
