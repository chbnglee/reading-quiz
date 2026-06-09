import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

wb = openpyxl.Workbook()

hdr_fill = PatternFill('solid', fgColor='7C3AED')
hdr_font = Font(bold=True, color='FFFFFF', name='Calibri')
thin = Side(style='thin', color='C4B5FD')
border = Border(left=thin, right=thin, top=thin, bottom=thin)
alt_fill = PatternFill('solid', fgColor='F5F3FF')

def style_header(ws, headers):
    for c, h in enumerate(headers, 1):
        cell = ws.cell(1, c, h)
        cell.font = hdr_font
        cell.fill = hdr_fill
        cell.alignment = Alignment(horizontal='center')

def style_rows(ws, data_rows, start=2):
    for r, row in enumerate(data_rows, start):
        for c, val in enumerate(row, 1):
            cell = ws.cell(r, c, val)
            if r % 2 == 0:
                cell.fill = alt_fill
            cell.border = border
            cell.alignment = Alignment(wrap_text=True, vertical='top')

# ── QUESTIONS ─────────────────────────────────────────────
ws1 = wb.active
ws1.title = 'QUESTIONS'
style_header(ws1, ['q_id','story_id','q_number','q_type_code','q_type_label',
                   'sg_element','sg_label_en','instruction_en',
                   'img_resource','audio_resource','correct_answer','scoring_type','max_score'])

q_rows = [
    ['OG0005_Q01','OG0005',1,'SEQ_DRAG','Sequence Drag & Drop','setting_sequence','Setting & Sequence',
     'Put the scenes in the right order.',
     'OG0005_SC02_I.png, OG0005_SC03_I.png, OG0005_SC05_I.png, OG0005_SC07_I.png, OG0005_SC12_I.png',
     '-','SC02, SC03, SC05, SC07, SC12','weighted_position',100],
    ['OG0005_Q02','OG0005',2,'LISTEN_MCQ','Listening MCQ','initiating_event','Initiating Event',
     'Listen and choose the matching scene.',
     'OG0005_SC03_I.png, OG0005_SC02_I.png, OG0005_SC05_I.png, OG0005_SC09_I.png',
     'Audio/OG0005_SC02_ST01_N_A.mp3','B','fixed_option_score',100],
    ['OG0005_Q03','OG0005',3,'WORD_DRAG','Word Unscramble Drag & Drop','attempt','Attempt',
     'Build the sentence! Drag the words into order.',
     '-','-','By, trapping, it,, you, extinguished, its, light.','weighted_sequence',100],
    ['OG0005_Q04','OG0005',4,'IMG_MCQ','Image MCQ','reaction','Reaction',
     'How does Didi feel in this scene?',
     'OG0005_SC08_I.png','-','B','fixed_option_score',100],
    ['OG0005_Q05','OG0005',5,'TEXT_MCQ','Text MCQ','initiating_event','Initiating Event',
     'What does Didi want at the start of the story?',
     '-','-','A','fixed_option_score',100],
    ['OG0005_Q06','OG0005',6,'TEXT_MCQ','Text MCQ','theme','Theme',
     'What lesson did Didi learn from this experience?',
     '-','-','B','fixed_option_score',100],
]
style_rows(ws1, q_rows)
for i, w in enumerate([15,10,10,15,28,22,22,46,56,32,42,22,12], 1):
    ws1.column_dimensions[get_column_letter(i)].width = w

# ── OPTIONS ───────────────────────────────────────────────
ws2 = wb.create_sheet('OPTIONS')
style_header(ws2, ['q_id','option_key','option_text','item_weight','score_value','is_correct','resource_file'])

opt_rows = [
    # Q1
    ['OG0005_Q01','1','SC02',2.5,'-','TRUE','OG0005_SC02_I.png'],
    ['OG0005_Q01','2','SC03',1.5,'-','TRUE','OG0005_SC03_I.png'],
    ['OG0005_Q01','3','SC05',1.5,'-','TRUE','OG0005_SC05_I.png'],
    ['OG0005_Q01','4','SC07',1.5,'-','TRUE','OG0005_SC07_I.png'],
    ['OG0005_Q01','5','SC12',2.5,'-','TRUE','OG0005_SC12_I.png'],
    # Q2
    ['OG0005_Q02','A','SC03 image (distractor)','-',25,'FALSE','OG0005_SC03_I.png'],
    ['OG0005_Q02','B','SC02 image (correct — initiating event)','-',100,'TRUE','OG0005_SC02_I.png'],
    ['OG0005_Q02','C','SC05 image (distractor)','-',15,'FALSE','OG0005_SC05_I.png'],
    ['OG0005_Q02','D','SC09 image (distractor)','-',5,'FALSE','OG0005_SC09_I.png'],
    # Q3
    ['OG0005_Q03','1','By',1.5,'-','TRUE','-'],
    ['OG0005_Q03','2','trapping',2.5,'-','TRUE','-'],
    ['OG0005_Q03','3','it,',1.0,'-','TRUE','-'],
    ['OG0005_Q03','4','you',1.5,'-','TRUE','-'],
    ['OG0005_Q03','5','extinguished',2.5,'-','TRUE','-'],
    ['OG0005_Q03','6','its',1.5,'-','TRUE','-'],
    ['OG0005_Q03','7','light.',2.0,'-','TRUE','-'],
    # Q4
    ['OG0005_Q04','A','Frustrated','-',50,'FALSE','OG0005_SC08_I.png'],
    ['OG0005_Q04','B','Disappointed','-',100,'TRUE','OG0005_SC08_I.png'],
    ['OG0005_Q04','C','Happy','-',0,'FALSE','OG0005_SC08_I.png'],
    ['OG0005_Q04','D','Shocked','-',20,'FALSE','OG0005_SC08_I.png'],
    # Q5
    ['OG0005_Q05','A','To capture a piece of the rainbow cloud.','-',100,'TRUE','-'],
    ['OG0005_Q05','B','To travel across the universe with Podo.','-',0,'FALSE','-'],
    ['OG0005_Q05','C','To share the cloud\'s beauty with friends.','-',20,'FALSE','-'],
    ['OG0005_Q05','D','To learn why stardust clouds glow.','-',10,'FALSE','-'],
    # Q6
    ['OG0005_Q06','A','Stardust clouds are made of beautiful colors.','-',10,'FALSE','-'],
    ['OG0005_Q06','B','True beauty belongs to the open sky, not a shelf.','-',100,'TRUE','-'],
    ['OG0005_Q06','C','It is important to always listen to your friend\'s advice.','-',20,'FALSE','-'],
    ['OG0005_Q06','D','Capturing rare things is a way to keep their beauty forever.','-',0,'FALSE','-'],
]
style_rows(ws2, opt_rows)
for i, w in enumerate([15,11,52,13,12,10,30], 1):
    ws2.column_dimensions[get_column_letter(i)].width = w

# ── SCORING_RULES ─────────────────────────────────────────
ws3 = wb.create_sheet('SCORING_RULES')
style_header(ws3, ['q_id','scoring_type','formula_pseudocode','note'])

sr_rows = [
    ['OG0005_Q01','weighted_position',
     'score = round( SUM(weight_i * max(0, 1 - |placed_pos_i - correct_pos_i| * 0.5)) / SUM(weight_i) * 100 )',
     '정위치에서 1칸 이탈 시 해당 weight의 50% 감점. SC02, SC12 weight 2.5 (앵커).'],
    ['OG0005_Q02','fixed_option_score',
     'score = opts[selected].score_value',
     '선택지별 고정 점수 적용. A:25 B:100 C:15 D:5'],
    ['OG0005_Q03','weighted_sequence',
     'score = round( SUM(weight_i * (placed_word_i === correct_word_i ? 1 : 0)) / SUM(weight_i) * 100 )',
     '정위치 단어 weight 누적. 7단어 구성. trapping/extinguished weight 2.5.'],
    ['OG0005_Q04','fixed_option_score',
     'score = opts[selected].score_value',
     '선택지별 고정 점수 적용. A:50 B:100 C:0 D:20'],
    ['OG0005_Q05','fixed_option_score',
     'score = opts[selected].score_value',
     '선택지별 고정 점수 적용. A:100 B:0 C:20 D:10'],
    ['OG0005_Q06','fixed_option_score',
     'score = opts[selected].score_value',
     '선택지별 고정 점수 적용. A:10 B:100 C:20 D:0'],
]
style_rows(ws3, sr_rows)
for i, w in enumerate([15,22,72,44], 1):
    ws3.column_dimensions[get_column_letter(i)].width = w

# ── Q02_SENT_MATCH (Load Quiz Data 호환) ──────────────────
ws4 = wb.create_sheet('Q02_SENT_MATCH')
style_header(ws4, ['field','value'])
match_rows = [
    ['audio_src','Audio/OG0005_SC02_ST01_N_A.mp3'],
    ['sentence_en',''],
    ['sentence_ko',''],
]
style_rows(ws4, match_rows)
ws4.column_dimensions['A'].width = 18
ws4.column_dimensions['B'].width = 44

wb.save(r'C:\Users\bonni\Desktop\ISM\Content\Quiz\OG0005\OG0005_ReadingQuiz.xlsx')
print('Done:', r'OG0005\OG0005_ReadingQuiz.xlsx')
