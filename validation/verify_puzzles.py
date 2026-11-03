"""기획서의 유한한 정답 후보와 선행 관계만 검증한다. 게임 실행 검증이 아니다."""

from fractions import Fraction
from itertools import permutations, product
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
RESULTS = []


def check(puzzle_id, domain, predicate, expected, note):
    candidates = list(domain)
    actual = [candidate for candidate in candidates if predicate(candidate)]
    assert set(actual) == set(expected), (puzzle_id, actual, expected)
    RESULTS.append((puzzle_id, len(candidates), len(actual), note))


def rotate(points, size=4):
    return {(size - 1 - y, x) for x, y in points}


def ray_exit(mirrors, orientations, start, direction, size):
    states = set()
    x, y = start
    dx, dy = direction
    arrangement = dict(zip(mirrors, orientations))
    while True:
        x, y = x + dx, y + dy
        if not (1 <= x <= size and 1 <= y <= size):
            return x, y
        state = (x, y, dx, dy)
        if state in states:
            return None
        states.add(state)
        if (x, y) in arrangement:
            dx, dy = (-dy, -dx) if arrangement[x, y] == "/" else (dy, dx)


def postal_plan_valid(actions):
    sender_next, receiver_last, pending_ack = 41, 41, None
    deliveries = [41]
    for action in actions:
        if action == "R41" and sender_next == 41:
            pending_ack = 41
        elif action == "A41" and pending_ack == 41 and sender_next == 41:
            sender_next, pending_ack = 42, None
        elif action == "S42" and sender_next == 42 and receiver_last == 41:
            receiver_last, pending_ack = 42, 42
            deliveries.append(42)
        elif action == "A42" and pending_ack == 42 and sender_next == 42:
            sender_next, pending_ack = 43, None
        else:
            return False
    return sender_next == 43 and deliveries == [41, 42] and pending_ack is None


def graph_paths(graph, current="S", path=("S",), cost=0):
    if current == "T":
        yield path, cost
        return
    for following, weight in graph.get(current, []):
        if following not in path:
            yield from graph_paths(graph, following, path + (following,), cost + weight)


def main():
    check("P00-1", permutations("CTS"), lambda p: p == tuple("CTS"),
          [tuple("CTS")], "기호와 소켓의 직접 대응 1종")
    check("P00-2", ["H", "G", "L"], lambda p: p == "H", ["H"],
          "사각 축·톱니 홈을 함께 만족하는 손잡이 H")

    check("R1-1", permutations("DABC"),
          lambda p: p.index("D") < p.index("A") < p.index("B")
          and p.index("C") == p.index("B") + 1,
          [tuple("DABC")], "운반대→비→정전→봉인")
    stencil = {(0, 0), (0, 1), (1, 1), (2, 1), (2, 2), (3, 2)}
    board = set(product(range(4), repeat=2))
    fixed = board - rotate(stencil)
    rotated = [stencil]
    for _ in range(3):
        rotated.append(rotate(rotated[-1]))
    check("R1-2", range(4), lambda k: not rotated[k] & fixed
          and rotated[k] | fixed == board, [1], "고정판 B와 A의 시계방향 90도 합성")
    check("R1-3", permutations("DABC"), lambda p: p == tuple(reversed("DABC")),
          [tuple("CBAD")], "복구는 봉인→정전→비→운반대의 역순")

    check("R2-1", product(range(1, 7), repeat=3),
          lambda p: p[0] + p[1] == 5 and p[1] + p[2] == 8 and p[0] + p[2] == 7,
          [(2, 3, 5)], "씨앗 A/B/C의 질량 2/3/5")
    check("R2-2", product((0, 1), repeat=4),
          lambda p: sum(v * east for v, east in zip((1, 2, 3, 4), p)) == 4
          and p[3] == 0, [(1, 0, 1, 0)], "동쪽 1+3, 서쪽 2+4; 4눈금은 침전조")
    check("R2-3", range(6), lambda t: t % 2 != 0 and t % 3 != 0 and t in (4, 5),
          [5], "송풍·분무가 모두 멈추고 꽃이 열린 박자 5")

    sky = {(3, 4), (4, 4), (4, 5), (5, 5), (1, 1), (1, 5), (5, 2), (6, 6)}
    motif = {(0, 0), (1, 0), (1, 1), (2, 1)}
    check("R3-1", product(range(1, 7), repeat=2),
          lambda p: {(p[0] + x, p[1] + y) for x, y in motif} <= sky,
          [(3, 4)], "회전 없는 별무늬의 기준점 (3,4)")
    mirrors = ((2, 2), (2, 4), (4, 4))
    check("R3-2", product(("/", "\\"), repeat=3),
          lambda p: ray_exit(mirrors, p, (0, 2), (1, 0), 5) == (4, 0),
          [("\\", "\\", "/")], "서쪽 광원에서 북쪽 4열로 이르는 거울 3개")
    check("R3-3", product(range(1, 6), repeat=2),
          lambda p: p[0] - p[1] == 1 and p[0] + p[1] == 7,
          [(4, 3)], "두 관측선의 교점 (4,3)")

    check("R4-1", permutations("WBFD"),
          lambda p: p.index("B") == p.index("W") + 1 and p.index("D") in (0, 3)
          and p.index("F") < p.index("D") and p.index("B") != 2,
          [tuple("WBFD")], "왼쪽부터 늑대·새·물고기·사슴")
    check("R4-2", product(range(4), range(2, 6), range(4, 8)),
          lambda p: 2 - p[0] == 0 and p[1] - 2 * p[0] == 0
          and p[2] - 3 * p[0] == 0, [(2, 4, 6)], "시점 2, 중간 4, 뒤 6")
    masks = ((1, 1, 0, 0), (0, 1, 1, 0), (0, 0, 1, 1), (1, 0, 0, 0))
    check("R4-3", product((0, 1), repeat=4),
          lambda p: tuple(sum(p[i] * masks[i][j] for i in range(4)) % 2
                          for j in range(4)) == (1, 0, 0, 1),
          [(1, 1, 1, 0)], "A/B/C 홀수 회, D 짝수 회; 실행 순서 자유")

    compass = "NESW"
    check("R5-1", permutations(compass),
          lambda p: (compass.index(p[0]) - compass.index(p[1])) % 4 == 1
          and (compass.index(p[2]) - compass.index(p[0])) % 4 == 2
          and p[3] in "NE" and p[1] != "W",
          [tuple("WSEN")], "봉투 P/Q/R/S는 서/남/동/북")
    check("R5-2", permutations(("R41", "A41", "S42", "A42")), postal_plan_valid,
          [("R41", "A41", "S42", "A42")], "재전송41→확인41→새42→확인42, 인도는 41/42 각 1회")
    assert not postal_plan_valid(("A41", "R41", "S42", "A42"))
    graph = {"S": [("A", 2), ("B", 1)], "A": [("C", 2), ("T", 7)],
             "B": [("C", 4), ("T", 9)], "C": [("T", 3)]}
    check("R5-3", graph_paths(graph), lambda p: p[1] <= 7,
          [(("S", "A", "C", "T"), 7)], "7박자 안 도착 가능한 단방향 경로 1종")

    turns = (Fraction(1, 2), Fraction(1), Fraction(3, 2), Fraction(2), Fraction(3))
    check("R6-1", product(("CW", "CCW"), turns),
          lambda p: p[0] == "CCW" and p[1] == Fraction(3 * 12, 36),
          [("CCW", Fraction(1))], "최종축 반시계 1회전; 중간 18/24 이 기어 순서는 둘 다 허용")
    for middle in permutations((18, 24)):
        ratio = Fraction(3)
        gears = (12,) + middle + (36,)
        for left, right in zip(gears, gears[1:]):
            ratio *= Fraction(-left, right)
        assert ratio == -1
    check("R6-2", range(60), lambda t: t % 3 == 2 and t % 4 == 1 and t % 5 == 4,
          [29], "0~59 중 세 위상이 일치하는 박자 29")
    check("R6-3", product((0, 1), repeat=6),
          lambda p: (p[0] ^ p[1]) == 1 and (p[1] & p[2]) == 1
          and p[3] == 0 and (p[2] | p[4]) == 1 and (p[3] ^ p[5]) == 1
          and sum(p) == 3,
          [(0, 1, 1, 0, 0, 1)], "B/C/F만 켜며, 보조선 E의 숨은 여유도 전력 제한으로 제거")

    allowed = ({"L"}, {"R"}, {"L"}, {"R", "M"})
    check("F-1", product("LRM", repeat=4),
          lambda p: all(p[t] in allowed[t] for t in range(4))
          and (p.count("L"), p.count("R"), p.count("M")) == (2, 1, 1),
          [tuple("LRLM")], "왼쪽→오른쪽→왼쪽→가운데, 총량 4 보존")
    final_mirrors = ((2, 5), (2, 2), (5, 2))
    final_domain = ((mir, c, mid, back) for mir in product(("/", "\\"), repeat=3)
                    for c, mid, back in product(range(4), range(4, 8), range(7, 11)))
    check("F-2", final_domain,
          lambda p: ray_exit(final_mirrors, p[0], (0, 5), (1, 0), 6) == (5, 7)
          and 3 - p[1] == 0 and p[2] - 2 * p[1] == 0 and p[3] - 3 * p[1] == 0,
          [(("/", "/", "\\"), 3, 6, 9)], "새 반사 배치와 새 투영 배치의 결합 상태 1종")
    final_records = ((order, drop, undo) for order in permutations("SRDK")
                     for drop in "SRDK" for undo in permutations(c for c in "SRDK" if c != drop))
    check("F-3", final_records,
          lambda p: p[0].index("S") < p[0].index("R") < p[0].index("D") < p[0].index("K")
          and p[1] == "D" and p[2] == tuple(reversed([c for c in p[0] if c != p[1]])),
          [(tuple("SRDK"), "D", tuple("KRS"))], "사건 SRDK, 중복 D 제외, 처리 복구 KRS")

    cards = {"A": ("right", 2), "B": ("left", 1), "C": ("right", 1)}
    check("O-1", cards, lambda p: cards[p] == ("right", 1), ["C"], "오른쪽 홈·한 줄 물결의 원본")
    before, after = {"A": 2, "B": 6, "C": 3}, {"A": 5, "B": 6, "C": 4}
    growth = {key: after[key] - before[key] for key in before}
    check("O-2", before, lambda p: growth[p] == max(growth.values()), ["A"], "최종 높이와 성장량을 구분; 가장 큰 B는 성장0")
    trail = {"A": ("N", "E"), "B": ("E", "S"), "C": ("S", "E"), "D": ("W", "N")}
    check("O-3", trail, lambda p: (compass.index(trail[p][1]) - compass.index(trail[p][0])) % 4 != 1,
          ["C"], "시계방향 한 칸 회전과 맞지 않는 C")
    check("O-4", product("LS", repeat=3), lambda p: p * 2 == tuple("LSSLSS"),
          [tuple("LSS")], "고정 시작 박자의 길게·짧게·짧게 반복")
    check("O-5", product(range(3), range(3), range(2)),
          lambda p: sum(p) == 4 and sum(n * v for n, v in zip(p, (3, 5, 7))) == 18,
          [(2, 1, 1)], "3표 2장, 5표 1장, 7표 1장; 우표 위치 순서는 자유")
    check("O-6", product((0, 1), repeat=4),
          lambda p: 1 + sum(w * left for w, left in zip((1, 2, 4, 8), p))
          == sum(w * (1 - left) for w, left in zip((1, 2, 4, 8), p)),
          [(1, 1, 1, 0)], "고정추 1이 있는 왼쪽에 1/2/4, 오른쪽에 8")

    dependencies = {"P00-1": set(), "P00-2": {"P00-1"}}
    for room in range(1, 7):
        stage_pre = {"P00-2"} if room <= 2 else ({"R1-3", "R2-3"} if room <= 4 else {"R3-3", "R4-3"})
        dependencies[f"R{room}-1"] = stage_pre
        dependencies[f"R{room}-2"] = {f"R{room}-1"}
        dependencies[f"R{room}-3"] = {f"R{room}-2"}
        dependencies[f"O-{room}"] = {f"R{room}-2"}
    dependencies.update({"F-1": {"R5-3", "R6-3"}, "F-2": {"F-1"}, "F-3": {"F-2"}})
    ids = {row[0] for row in RESULTS}
    assert len(RESULTS) == len(ids) == len(dependencies) == 29
    assert all(pre <= ids for pre in dependencies.values())
    reached = set()
    while True:
        following = {key for key, pre in dependencies.items() if pre <= reached}
        if following <= reached:
            break
        reached |= following
    assert reached == ids, "선행 관계에 순환 또는 도달 불가능 노드가 있다"
    main_ids = {key for key in ids if not key.startswith("O-")}
    assert len(main_ids) == 23
    assert all(not any(key.startswith("O-") for key in dependencies[node]) for node in main_ids)
    documented = []
    puzzle_files = sorted((ROOT / "puzzles").glob("*.md"))
    for file in puzzle_files:
        documented += re.findall(r"^## ((?:P00|R[1-6]|F|O)-\d+)\b", file.read_text(encoding="utf-8"), re.M)
    assert len(documented) == 29 and set(documented) == ids, (len(documented), set(documented) ^ ids)

    broken_links = []
    for file in ROOT.rglob("*.md"):
        if any(part in {"node_modules", "dist", ".git"} for part in file.relative_to(ROOT).parts):
            continue
        content = file.read_text(encoding="utf-8")
        assert chr(65533) not in content, f"문자 손상: {file}"
        assert sum(line.startswith(chr(96) * 3) for line in content.splitlines()) % 2 == 0, f"닫히지 않은 코드 블록: {file}"
        for target in re.findall(r"\]\(([^)]+)\)", content):
            if target.startswith(("http:", "https:", "#", "mailto:")):
                continue
            path = target.split("#", 1)[0]
            if path and not (file.parent / path).exists():
                broken_links.append((str(file.relative_to(ROOT)), target))
    assert not broken_links, broken_links

    report = ["# 퍼즐 명세 검증 결과", "", "검증일: 2026-11-03 · 기획 v1.0 · Python 표준 라이브러리", "",
              "실행: `python -X utf8 validation/verify_puzzles.py` (기획 폴더에서 실행)", "",
              "수치·도형·기호·선행 관계를 명세된 유한 범위에서 검사했다. 실행 가능한 게임이나 전체 게임 상태를 검증한 결과가 아니다.", "",
              "| 퍼즐 | 후보 수 | 허용 정답 상태 수 | 확인 사항 |", "|---|---:|---:|---|"]
    report += [f"| {pid} | {count} | {answers} | {note} |" for pid, count, answers, note in RESULTS]
    report += ["", "## 구조 확인", "", "- 퍼즐 카드 29개: 필수 23, 선택 6. 중복 ID 없음.",
               "- 모든 선행 노드가 존재하고 의존 그래프에 순환 없음.",
               "- 필수 경로가 선택 퍼즐을 선행 조건으로 요구하지 않음.",
               "- 기어의 두 중간 배치가 같은 결과를 만드는 것을 별도로 확인.",
               "- 우편 확인이 재전송보다 먼저인 반례는 거부됨.",
               "- 문서의 상대 파일 링크가 실제 파일을 가리킴. 문서 내부 앵커는 미검증.",
               "- Markdown을 UTF-8로 읽을 수 있고, 대체 문자 및 닫히지 않은 코드 블록이 없음.", "",
               "## 판정의 범위", "",
               "정답 상태 수 1은 명시한 후보·규칙에 대한 값이다. 모든 실제 조작 순서가 하나라는 뜻이 아니다. 토글·우표·기어의 동치 입력은 퍼즐 카드에서 허용한다.", "",
               "스크립트와 기획서는 같은 문서 작성자가 작성했다. 독립된 구현이나 제3자 평가 결과가 아니다. 수치·좌표·규칙을 바꾸면 스크립트와 카드 양쪽을 함께 재검토해야 한다.", "",
               "재미, 난이도, 실제 소요 시간, 도트 화면의 가독성, 입력 편의, 저장 복원, 게임 엔진의 반사·투영 구현, 모든 조작 순서의 교착 여부는 아직 검증하지 않았다. 이후 절차는 [플레이테스트 계획](../production/PLAYTEST_PLAN.md)을 따른다.", ""]
    output = Path(__file__).with_name("VALIDATION_REPORT.md")
    output.write_text("\n".join(report), encoding="utf-8")
    print(f"PASS: {len(RESULTS)} puzzle specifications; 23 required / 6 optional; dependency DAG; relative links")
    print(f"Report: {output}")


if __name__ == "__main__":
    main()
