# Reading Quiz v2 설계 가이드

대상: 영어 독서 플랫폼 기획자, 콘텐츠 설계자, 프론트엔드/백엔드 개발자  
기준 산출물: Quiz/v2/OG0021, Quiz v2 종합 리포트 샘플  
작성일: 2026-06-22

> 이 문서는 Quiz v2의 문항 구조, Story Grammar 매핑, 채점 계산식, Synthesis 문항의 역할, 개별/종합 학부모 리포트 구성을 한 곳에서 파악하기 위한 운영 가이드다. 이후 다른 스토리로 양산하거나 LCMS/백엔드/프론트 구현으로 확장할 때 기준 문서로 사용할 수 있다.

## 1. v2의 핵심 설계 방향

v1은 Story Grammar 요소가 여러 문항에 섞여 있거나 한 문항이 복수 요소를 동시에 대표하는 경우가 있었다. v2는 이를 정리하여 여섯 개 Story Grammar 축을 각각 하나의 대표 문항과 연결하고, 이야기 전체 의미를 묻는 Synthesis 문항을 별도로 둔다.

| 설계 원칙 | v2 적용 방식 | 의미 |
|---|---|---|
| Story Grammar 1:1 매핑 | Q01-Q06이 각각 Consequence, Setting, Initiating Event, Attempt, Reaction, Internal Response를 대표한다. | 학부모 리포트에서 육각형 그래프의 각 축을 수치화할 수 있다. |
| 문항 순서는 스토리 전개 우선 | Story Grammar의 이론 순서가 아니라, 학습자가 이야기를 되짚는 흐름에 맞춰 문항 순서를 배열한다. | 각 스토리마다 문항 순서는 달라질 수 있지만, 여섯 축은 항상 포함된다. |
| 문항 유형 다양화 | 시퀀싱, 슬롯 채우기, 듣고 장면 고르기, 언스크램블, 선택형 문항을 혼합한다. | 모든 문항을 사지선다로 만들 때의 시험 느낌을 줄이고 디지털 플랫폼의 상호작용성을 살린다. |
| 오답도 정보로 사용 | 오답 유형마다 점수와 weakness signal을 다르게 둔다. | 단순 정오답보다 학생이 어떤 인지 지점에서 흔들렸는지 파악할 수 있다. |
| Synthesis 별도 관리 | Q07은 육각형 그래프 축에는 넣지 않고 전체 독해 점수에 20% 반영한다. | 전체 의미 파악을 보존하되 Story Grammar 6축 리포트의 해석은 흐리지 않는다. |

## 2. Story Grammar 축 정의

| 축 | 한국어 해석 | 측정 초점 | v2 대표 문항 |
|---|---|---|---|
| Setting | 배경 이해 | 이야기의 시간, 장소, 인물, 처음 상황을 이해하는가 | Q02 Setting Slot Drag |
| Initiating Event | 사건 시작 | 문제가 시작된 장면이나 원인을 파악하는가 | Q03 Listening Scene Match |
| Attempt | 해결 행동 | 인물이 문제 해결을 위해 어떤 행동을 했는가 | Q04 Scene-Anchored Unscramble |
| Reaction | 감정 반응 | 사건 결과에 대한 겉으로 드러난 감정과 반응을 이해하는가 | Q05 Feeling Match |
| Internal Response | 내면 추론 | 인물의 생각, 의도, 동기 등 내적 상태를 추론하는가 | Q06 Internal Response MCQ |
| Consequence | 결과 이해 | 행동의 결과와 사건 전개를 순서대로 이해하는가 | Q01 Story Scene Sequence |

## 3. 문항 구성 요약

| 문항 | 유형 | 대표 축 | 학생 과업 | 핵심 리소스 | 채점 방식 |
|---|---|---|---|---|---|
| Q01 | Story Scene Sequence | Consequence | 다섯 장면을 이야기 순서대로 배열한다. | SC01, SC02, SC03, SC06, SC09 이미지 | 장면 weight + 위치 거리 기반 부분점수 |
| Q02 | Setting Slot Drag | Setting | 첫 장면을 보고 Who, Where, At first 칸을 채운다. | SC01 이미지 + 단어 카드 6개 | 정답 100%, 같은 슬롯 유형 오답 35%, 다른 슬롯 0% |
| Q03 | Listening Scene Match | Initiating Event | 문장을 듣고 문제가 시작되는 장면을 고른다. | SC02_ST01_N 오디오 + 장면 이미지 | 선택지별 고정 점수 |
| Q04 | Scene-Anchored Unscramble | Attempt | SC03 장면의 원문 문장을 단어 카드로 복원한다. | SC03 이미지 + "Milo walks into the forest." | 단어 weight + 정확한 위치 일치 |
| Q05 | Feeling Match | Reaction | 장면 속 Milo의 감정을 고른다. | SC06 이미지 | 선택지별 고정 점수 |
| Q06 | Internal Response MCQ | Internal Response | Milo의 속마음이나 생각을 고른다. | SC06 장면 맥락 | 선택지별 고정 점수 |
| Q07 | Synthesis MCQ | Synthesis | 이야기 전체에서 Milo가 깨달은 의미를 고른다. | 전체 이야기 | 선택지별 고정 점수, 전체 점수에 20% 반영 |

## 4. 문항별 상세 설계와 계산식

### Q01. Story Scene Sequence - Consequence

Q01은 전체 사건 전개를 먼저 훑는 문항이다. 학습자가 이야기의 시작, 문제 발생, 시도, 감정적 저점, 해결 결과를 순서로 파악하는지 확인한다. 대표 Story Grammar 축은 Consequence이며, 여기서 Consequence는 단순 결말이 아니라 행동의 결과와 사건 전개를 포함한다.

| 장면 | 정답 위치 | 역할 | Weight | 설계 이유 |
|---|---:|---|---:|---|
| SC01 | 1 | Opening state | 1.5 | 문제 전 상태를 보여주지만 핵심 사건/결과보다는 낮은 가중치 |
| SC02 | 2 | Problem begins | 2.5 | 색을 잃는 핵심 문제 발생 장면 |
| SC03 | 3 | Attempt begins | 1.5 | 탐색이 시작되는 중간 연결 장면 |
| SC06 | 4 | Low point / Reaction | 1.5 | 시도의 결과와 감정 반응이 드러나는 장면 |
| SC09 | 5 | Final result | 2.5 | 색이 돌아오는 최종 결과 장면 |

FORMULA: score = round(sum(weight[scene] * max(0, 1 - abs(submitted_pos - correct_pos) * 0.5)) / sum(weights) * 100)

시퀀스 문항에서는 정답 위치와의 거리가 의미 있다. 한 칸 차이는 이야기 흐름의 큰 틀은 이해했지만 인접 사건을 혼동한 것으로 보고 50% 부분점수를 준다. 두 칸 이상 벗어나면 해당 장면의 위치 이해가 크게 흔들린 것으로 보고 0점 처리한다.

### Q02. Setting Slot Drag - Setting

Q02는 첫 장면을 보고 이야기의 배경 정보를 직접 구성하는 문항이다. 기존의 "Build the story setting"처럼 추상적인 지시문 대신, "Look at the first scene. Fill in the boxes."로 명료화했다.

| 슬롯 | 정답 | Weight | 오답 부분점수 |
|---|---|---:|---|
| Who? | chameleon | 2.5 | butterfly를 Who에 놓으면 같은 범주 오답으로 35% |
| Where? | forest | 2.0 | pond를 Where에 놓으면 같은 범주 오답으로 35% |
| At first... | loves changing colors | 1.5 | loses his color를 At first에 놓으면 같은 범주 오답으로 35% |

FORMULA: score = round(sum(slot_weight if exact_target else slot_weight * 0.35 if same_slot_category else 0) / sum(slot_weights) * 100)

35% slot credit은 정답은 아니지만 범주 판단은 맞은 경우의 부분점수다. 예를 들어 pond는 정답 장소는 아니지만 장소 카드이므로 Where 칸에 들어가면 35%를 받는다. 반대로 pond가 Who나 At first 칸에 들어가면 범주 자체가 틀렸으므로 0점이다.

### Q03. Listening Scene Match - Initiating Event

Q03은 사건이 시작되는 원인을 장면으로 식별하는 문항이다. 듣고 장면 고르기 유형은 언어 입력과 이야기 구조 이해를 동시에 사용하지만, 채점의 핵심은 들은 문장이 어느 사건 단계에 속하는지 판단하는 데 있다.

| 선택지 | 점수 | 해석 |
|---|---:|---|
| A: SC02 | 100 | Milo가 회색으로 깨어나는 문제 발생 장면 |
| B: SC03 | 20 | 문제 이후의 탐색 장면을 사건 시작과 혼동 |
| C: SC06 | 30 | 문제의 결과로 나타난 슬픔 장면을 사건 시작으로 혼동 |
| D: SC09 | 0 | 문제 시작과 해결 장면을 반대로 이해 |

### Q04. Scene-Anchored Unscramble - Attempt

Q04는 장면 이미지와 같은 위치에서 나온 원문 문장을 복원하는 문항이다. v2에서는 처음 보는 문장을 만들지 않고, SC03_ST01_N의 "Milo walks into the forest."를 그대로 사용한다. 이는 학습자의 낮은 언어 수준을 고려하여 장면-문장 연결을 명확하게 하기 위한 결정이다.

| 단어 | 정답 위치 | Weight | 의미 |
|---|---:|---:|---|
| Milo | 1 | 1.5 | 행동 주체 |
| walks | 2 | 2.5 | 핵심 attempt action |
| into | 3 | 1.5 | 행동의 방향 |
| the | 4 | 1.0 | 구문 보조 |
| forest. | 5 | 2.5 | 시도가 시작되는 장소 |

FORMULA: score = round(sum(weight[word] if submitted_pos == correct_pos else 0) / sum(weights) * 100)

시퀀스 문항과 달리 언스크램블에서는 "가까운 위치"가 항상 의미 있는 이해도 차이를 설명하지 않는다. 예를 들어 walks가 한 칸 밀려도 주어-동사-전치사구 구조가 깨진다. 따라서 단어별 중요도 weight는 유지하되, 위치는 정확히 맞은 경우만 점수로 인정한다.

### Q05. Feeling Match - Reaction

Q05는 사건 결과에 대해 겉으로 드러난 감정 반응을 읽는 문항이다. SC06에서 Milo가 우는 장면을 보고 sad를 고르는 것이 정답이다.

| 선택지 | 점수 | 해석 |
|---|---:|---|
| Happy | 0 | 해결 장면의 기쁨을 현재 장면에 잘못 적용 |
| Sad | 100 | 장면의 감정 반응을 정확히 파악 |
| Angry | 40 | 부정 감정은 맞지만 sad와 angry 구별이 약함 |
| Surprised | 20 | 갑작스러운 사건 반응과 슬픔을 혼동 |

### Q06. Internal Response MCQ - Internal Response

Q06은 표면 감정이 아니라 인물의 생각과 내적 상태를 추론하는 문항이다. Reaction과 구분하기 위해 "어떻게 보이는가"가 아니라 "무슨 생각을 하고 있는가"를 묻는다.

| 선택지 | 점수 | 해석 |
|---|---:|---|
| Everyone has their own color. | 100 | 장면의 문장과 내면 의미를 정확히 연결 |
| I want to fly with the butterfly. | 20 | 앞선 행동 장면을 속마음으로 혼동 |
| The pond is very blue. | 45 | 표면 정보는 보지만 내면 추론은 부족 |
| I do not need my color. | 0 | Milo의 핵심 동기를 반대로 이해 |

### Q07. Synthesis MCQ - 전체 의미 파악

Q07은 Story Grammar 6축에는 넣지 않는 별도 Synthesis 문항이다. Main Idea를 완전히 버리지 않기 위해 남겨두되, 육각형 그래프에는 반영하지 않는다. 대신 전체 독해 점수에 20% 반영한다.

| 선택지 | 점수 | 해석 |
|---|---:|---|
| Colors keep you safe. | 10 | 카멜레온의 생태 사실을 주제로 혼동 |
| Friends always help you. | 30 | 친구의 도움이라는 행동만 주제로 잡음 |
| Your color is inside you. | 100 | 이야기 전체 의미를 종합 |
| The world has many colors. | 20 | 색과 배경 분위기를 전체 의미로 혼동 |

## 5. Synthesis와 전체 점수의 관계

v2 리포트의 육각형 그래프는 Story Grammar 6축만 사용한다. Q07 Synthesis는 그래프에 넣지 않는다. 이유는 Synthesis가 Setting, Attempt, Consequence 등 특정 한 축에 속하기보다 이야기 전체 의미를 종합하는 별도 능력에 가깝기 때문이다.

FORMULA: storyGrammarAvg = average(Setting, Initiating Event, Attempt, Reaction, Internal Response, Consequence)

FORMULA: bookOverall = round(storyGrammarAvg * 0.8 + synthesis * 0.2)

이 구조는 두 가지 장점이 있다. 첫째, Story Grammar 6축의 해석이 깨끗하게 유지된다. 둘째, Main Idea나 전체 함의 파악을 별도 Synthesis로 보존하여 종합 독해 점수에 반영할 수 있다.

## 6. 개별 학부모 리포트 구성

개별 퀴즈 리포트는 학생에게는 간단한 완료/정오답 피드백을 제공하고, 학부모에게는 Story Grammar별 수치와 해석을 제공한다. v2에서는 특히 학부모 리포트가 단순 점수표가 아니라 "어떤 독해 기능이 안정적이고 어떤 기능이 흔들리는지"를 보여주는 데 초점을 둔다.

| 구성 요소 | 내용 | 의미 |
|---|---|---|
| Story Grammar Profile | 6축 점수를 육각형 그래프로 표시 | 학생의 서사 이해 프로필을 직관적으로 보여준다. |
| 문항별 코멘트 | 각 축 점수와 해석, 보완 포인트 | 오답 자체보다 부족한 독해 기능을 설명한다. |
| Synthesis | 이야기 전체 의미 파악 점수 | 6축과 별도로 전체 함의 이해를 확인한다. |
| 집중관리영역 | 낮은 축 또는 반복적으로 흔들린 축 | 다음 학습 활동과 연결된다. |

## 7. 종합 리포트 구성과 계산식

종합 리포트는 여러 권의 개별 퀴즈 결과를 누적하여 일주일, 한 달, 학기 단위의 독해 성장을 보여준다. 현재 샘플 페이지는 10권을 읽었다는 가정으로 구성되어 있다.

| 섹션 | 표시 내용 | 계산/해석 |
|---|---|---|
| 요약 카드 | 읽은 책, 기간 종합점수, 가장 안정적인 항목, 집중 보완 항목 | 기간 내 학습량과 핵심 성과를 첫 화면에서 요약 |
| Story Grammar Profile | 6축 평균 점수 레이더 차트 | axisAvg = round(avg(book.axisScore)) |
| Learning Insights | 반복 취약 패턴, 강점, 향상된 영역 | weakCount, stableCount, trendDelta 기반 문장 생성 |
| Learning Progress | 날짜별 책 단위 종합점수 추이 | bookOverall을 날짜 순서로 연결 |
| Learning Details | 책별 6축, Synthesis, Overall 점수 | 세부 점수 확인용 heatmap table |
| Next Steps | 다음 학습 제안 | 가장 취약한 축과 반복 패턴에 따라 추천 |
| 실제 구현용 계산식 | 리포트 산출 공식 | 개발/검수용 부록 |

### 종합 리포트 핵심 공식

FORMULA: axisAvg(axis) = round(sum(book.axisScore) / completedBookCount)

FORMULA: axisLowCount(axis) = count(book.axisScore < 70)

FORMULA: axisStableCount(axis) = count(book.axisScore >= 85)

FORMULA: trendDelta(axis) = avg(lastHalf.axisScore) - avg(firstHalf.axisScore)

FORMULA: periodOverall = round(avg(bookOverall over completed books))

FORMULA: stability(axis) = 100 - stdev(axisScores)

## 8. LRS/데이터 저장 관점

각 문항은 xAPI answered 이벤트로 저장하는 것을 전제로 한다. 공통적으로 score_raw와 sg_element를 저장하고, 문항 유형에 따라 추가 응답 데이터를 남긴다.

| 문항 유형 | 저장 권장 데이터 | 리포트 활용 |
|---|---|---|
| 시퀀싱 | scene_order, position_scores, score_raw | Consequence 축과 순서 이해 오류 분석 |
| 슬롯 채우기 | slot_answer_map, slot_scores, score_raw | Setting의 Who/Where/At first 하위 오류 분석 |
| MCQ/Scene Match | selected_option, option_score, weakness_signal | 오답 선택의 의미를 학부모 피드백으로 변환 |
| 언스크램블 | word_order, word_scores, score_raw | Attempt 문장 구조 및 핵심 행동 이해 분석 |
| Synthesis | selected_option, synthesis_score | 전체 의미 파악 점수 및 종합점수 20% 반영 |

## 9. 양산 시 적용 가이드

1. 스토리 전문에서 N 버전 문장만 사용한다. E/D 버전은 난이도 변형용으로 별도 관리한다.
2. 각 스토리마다 여섯 Story Grammar 축을 모두 포함하되, 문항 순서는 스토리 전개 흐름에 맞게 재배열한다.
3. 문항 유형은 고정하지 않는다. 다만 각 축을 가장 명료하게 측정할 수 있는 유형을 우선한다.
4. 시퀀싱은 장면 위치 거리가 의미 있으므로 인접 부분점수를 허용한다.
5. 언스크램블은 문장 구조상 가까운 위치가 반드시 부분 이해를 뜻하지 않으므로 exact position 기준을 기본값으로 둔다.
6. MCQ 오답은 모두 같은 0점으로 두지 말고, 의미상 가까운 오답에는 부분점수와 weakness signal을 부여한다.
7. Synthesis는 6축 그래프에 넣지 않고 별도 문항으로 둔 뒤 전체 점수에 20% 반영한다.
8. Reading Quiz 엑셀에는 상세 근거와 가중치 매트릭스를 남기고, DevSpec 엑셀에는 구현에 필요한 최소 메타데이터만 남긴다.

## 10. 현재 v2 산출물 기준

| 산출물 | 위치 | 역할 |
|---|---|---|
| OG0021_ReadingQuiz.html | Quiz/v2/OG0021 | v2 개별 퀴즈 실행 화면 |
| v2_overrides.js | Quiz/v2/OG0021 | v2 문항 구조, 채점, 리포트 로직 오버라이드 |
| OG0021_ReadingQuiz.xlsx | Quiz/v2/OG0021 | 상세 문항 정보, 가중치, 점수 매트릭스, LRS 매핑 |
| build_quiz_v2.py | Quiz/v2/OG0021 | v2 Reading Quiz 엑셀 재생성 스크립트 |
| weekly_report_sample.html | Quiz/v2 | 10권 누적 종합 리포트 샘플 화면 |

> 핵심 판단 요약: v2는 "각 Story Grammar 축을 하나의 대표 문항으로 측정하고, Synthesis를 별도로 보존한다"는 구조다. 시퀀스는 사건 전개 거리 자체가 의미 있으므로 위치 거리 기반 부분점수를 사용하고, 언스크램블은 문장 구조 복원 과제이므로 단어별 weight는 유지하되 정확한 위치만 인정한다. 종합 리포트는 개별 문항 점수를 누적해 학생의 독해 프로필, 반복 약점, 성장 추세, 다음 학습 제안을 보여주는 방향으로 설계한다.
