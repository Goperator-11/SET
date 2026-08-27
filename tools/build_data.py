#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""content/act*.js + tools/patches*.py  ->  public/assets/data.js

act 파일들은 JS 객체 리터럴이라 그대로 이어붙이면 되지만, 그러면 검증이 안 된다.
그래서 한 번 파싱해서 자료구조로 만들고, 패치를 병합한 뒤, JSON 으로 다시 뱉는다.
JSON 은 JS 의 부분집합이므로 `const ACTS=<json>;` 는 그대로 유효한 자바스크립트다.

    python tools/build_data.py
"""
import io, json, os, re, sys

try:                                  # 윈도우 콘솔(cp949)에서도 한글이 깨지지 않게
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
sys.path.insert(0, HERE)

import patches, patches_b, patches_q


def js_to_data(src):
    """act*.js 를 이어붙인 문자열을 파이썬 자료구조로. 키만 따옴표를 씌워 JSON 으로 읽는다."""
    src = src.strip()
    assert src.startswith("const ACTS="), src[:40]
    body = src[len("const ACTS="):].rstrip()
    assert body.endswith(";"), body[-40:]
    body = body[:-1]

    out, i, n, instr = [], 0, len(body), False
    while i < n:
        ch = body[i]
        if instr:
            out.append(ch)
            if ch == "\\":
                out.append(body[i + 1]); i += 2; continue
            if ch == '"':
                instr = False
            i += 1; continue
        if ch == '"':
            instr = True; out.append(ch); i += 1; continue
        m = re.match(r"([A-Za-z_][A-Za-z0-9_]*)\s*:", body[i:])
        prev = "".join(out).rstrip()[-1:] if out else "["
        if m and prev in "{,[":
            out.append('"%s":' % m.group(1)); i += m.end(); continue
        out.append(ch); i += 1
    return json.loads("".join(out))


def main():
    parts = []
    for i in range(1, 8):
        p = os.path.join(ROOT, "content", "act%d.js" % i)
        parts.append(io.open(p, encoding="utf-8").read())
    acts = js_to_data("".join(parts))

    days = {d["d"]: d for a in acts for d in a["days"]}
    print("파싱 완료 — ACT %d개, 일차 %d개" % (len(acts), len(days)))

    # ── 패치 병합 ──
    labs_added = qs_added = 0
    all_labs = dict(patches.EXTRA_LABS)
    for k, v in patches_b.MORE_LABS.items():
        all_labs.setdefault(k, []).extend(v) if k in all_labs else all_labs.update({k: v})

    for dn, extra in all_labs.items():
        if dn not in days:
            print("  ! 없는 일차 무시: %s" % dn); continue
        seen = set(days[dn]["lab"])
        for item in extra:
            if item not in seen:
                days[dn]["lab"].append(item); seen.add(item); labs_added += 1

    for dn, extra in patches_q.EXTRA_Q.items():
        if dn not in days:
            print("  ! 없는 일차 무시: %s" % dn); continue
        days[dn]["q"].extend(extra); qs_added += len(extra)

    for dn, files in patches_q.DAY_FILES.items():
        days[dn]["files"] = files
    for dn, flags in patches_q.DAY_FLAGS.items():
        days[dn].update(flags)

    print("패치 병합 — 실습 +%d, 문제 +%d" % (labs_added, qs_added))

    # ── 검증 ──
    problems = []
    nums = sorted(days)
    if nums != list(range(1, len(nums) + 1)):
        problems.append("일차 번호가 1..N 연속이 아님")

    labfiles = set(os.listdir(os.path.join(ROOT, "public", "labs")))
    n_input = n_mcq = 0
    for dn in nums:
        d = days[dn]
        for f in ("t", "g", "c"):
            if not d.get(f):
                problems.append("%d: %s 없음" % (dn, f))
        if not d.get("lab"):
            problems.append("%d: 실습 없음" % dn)
        if not d.get("q"):
            problems.append("%d: 문제 없음" % dn)
        for fl in d.get("files", []):
            if os.path.basename(fl["p"]) not in labfiles:
                problems.append("%d: 첨부 파일 없음 %s" % (dn, fl["p"]))
        for qi, q in enumerate(d.get("q", [])):
            if not q.get("t"):
                problems.append("%d/q%d: 질문 없음" % (dn, qi))
            if not q.get("e"):
                problems.append("%d/q%d: 해설 없음" % (dn, qi))
            if q.get("k") in ("cmd", "input"):
                n_input += 1
                if not q.get("a"):
                    problems.append("%d/q%d: 정답 후보 없음" % (dn, qi))
                for pat in q.get("re", []):
                    try:
                        re.compile(pat)
                    except re.error as e:
                        problems.append("%d/q%d: 정규식 오류 %s" % (dn, qi, e))
                # 모범 답안이 자기 정규식에 실제로 매칭되는지 확인
                if q.get("re") and q.get("a"):
                    norm = re.sub(r"\s+", " ", q["a"][0]).strip()
                    norm = re.sub(r"^sudo\s+", "", norm)
                    if not any(re.search(p, norm, re.I) for p in q["re"]):
                        problems.append("%d/q%d: 모범답안이 자기 정규식에 안 맞음 -> %r"
                                        % (dn, qi, q["a"][0]))
            else:
                n_mcq += 1
                o = q.get("o") or []
                if len(o) < 3:
                    problems.append("%d/q%d: 보기 부족" % (dn, qi))
                if not isinstance(q.get("a"), int) or not (0 <= q["a"] < len(o)):
                    problems.append("%d/q%d: 정답 인덱스 이상" % (dn, qi))
                if len(set(o)) != len(o):
                    problems.append("%d/q%d: 보기 중복" % (dn, qi))

    lab_counts = [len(days[d]["lab"]) for d in nums]
    print("실습 총 %d개 (일차당 최소 %d · 평균 %.1f · 최대 %d)"
          % (sum(lab_counts), min(lab_counts), sum(lab_counts) / len(lab_counts), max(lab_counts)))
    print("문제 총 %d개 — 객관식 %d · 직접입력 %d" % (n_mcq + n_input, n_mcq, n_input))
    print("보스 %d일차, 실전 랩 %d일차"
          % (sum(1 for d in nums if days[d].get("boss")),
             sum(1 for d in nums if days[d].get("lab_mode"))))

    if problems:
        print("\n문제 발견 %d건:" % len(problems))
        for p in problems[:40]:
            print("  -", p)
        sys.exit(1)
    print("검증 통과 — 문제 없음")

    out = "const ACTS=" + json.dumps(acts, ensure_ascii=False, separators=(",", ":")) + ";\n"
    dst = os.path.join(ROOT, "public", "assets", "data.js")
    io.open(dst, "w", encoding="utf-8", newline="\n").write(out)
    print("\n생성: public/assets/data.js  (%.1f KB)" % (len(out.encode()) / 1024))

    stamp_assets()


def stamp_assets():
    """HTML 의 assets 참조에 ?v=<해시> 를 붙인다.

    이걸 안 하면 업데이트 후에도 브라우저가 낡은 app.js 를 계속 쓰고,
    새 data.js 와 짝이 안 맞아 앱이 깨진다. 파일이 바뀔 때만 값이 바뀐다."""
    import hashlib
    pub = os.path.join(ROOT, "public")
    adir = os.path.join(pub, "assets")
    h = hashlib.sha256()
    for name in sorted(os.listdir(adir)):
        h.update(name.encode())
        h.update(io.open(os.path.join(adir, name), "rb").read())
    ver = h.hexdigest()[:10]

    pat = re.compile(r'((?:href|src)="assets/[A-Za-z0-9_.-]+)(?:\?v=[0-9a-f]+)?(")')
    changed = []
    for f in sorted(os.listdir(pub)):
        if not f.endswith(".html"):
            continue
        p = os.path.join(pub, f)
        s = io.open(p, encoding="utf-8").read()
        new = pat.sub(lambda m: m.group(1) + "?v=" + ver + m.group(2), s)
        if new != s:
            io.open(p, "w", encoding="utf-8", newline="\n").write(new)
            changed.append(f)
    print("자산 버전 %s 스탬프 — %s" % (ver, ", ".join(changed) if changed else "변경 없음"))


if __name__ == "__main__":
    main()
