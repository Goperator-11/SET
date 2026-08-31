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

import patches, patches_b, patches_q, patches_q2, patches_q3, patches_q4
import patches_ctf, patches_ctf2


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


def merge_and_validate(acts, lab_patches, q_patches, day_files, day_flags, label):
    """한 트랙(방어 또는 공격)의 acts 에 패치를 병합하고 검증한다."""
    days = {d["d"]: d for a in acts for d in a["days"]}
    print("[%s] 파싱 — ACT %d개, 일차 %d개" % (label, len(acts), len(days)))

    labs_added = qs_added = 0
    for dn, extra in lab_patches.items():
        if dn not in days:
            print("  ! [%s] 없는 일차 무시(lab): %s" % (label, dn)); continue
        seen = set(days[dn]["lab"])
        for item in extra:
            if item not in seen:
                days[dn]["lab"].append(item); seen.add(item); labs_added += 1
    for dn, extra in q_patches.items():
        if dn not in days:
            print("  ! [%s] 없는 일차 무시(q): %s" % (label, dn)); continue
        days[dn]["q"].extend(extra); qs_added += len(extra)
    for dn, files in day_files.items():
        if dn in days: days[dn]["files"] = files
    for dn, flags in day_flags.items():
        if dn in days: days[dn].update(flags)
    if lab_patches or q_patches:
        print("[%s] 패치 병합 — 실습 +%d, 문제 +%d" % (label, labs_added, qs_added))

    problems = []
    nums = sorted(days)
    if nums != list(range(1, len(nums) + 1)):
        problems.append("[%s] 일차 번호가 1..N 연속이 아님" % label)

    labfiles = set(os.listdir(os.path.join(ROOT, "public", "labs")))
    n_input = n_mcq = 0
    for dn in nums:
        d = days[dn]
        for f in ("t", "g", "c"):
            if not d.get(f):
                problems.append("[%s] %d: %s 없음" % (label, dn, f))
        if not d.get("lab"):
            problems.append("[%s] %d: 실습 없음" % (label, dn))
        if not d.get("q"):
            problems.append("[%s] %d: 문제 없음" % (label, dn))
        for fl in d.get("files", []):
            if os.path.basename(fl["p"]) not in labfiles:
                problems.append("[%s] %d: 첨부 파일 없음 %s" % (label, dn, fl["p"]))
        for qi, q in enumerate(d.get("q", [])):
            if not q.get("t"):
                problems.append("[%s] %d/q%d: 질문 없음" % (label, dn, qi))
            if not q.get("e"):
                problems.append("[%s] %d/q%d: 해설 없음" % (label, dn, qi))
            if q.get("k") in ("cmd", "input"):
                n_input += 1
                if not q.get("a"):
                    problems.append("[%s] %d/q%d: 정답 후보 없음" % (label, dn, qi))
                for pat in q.get("re", []):
                    try:
                        re.compile(pat)
                    except re.error as e:
                        problems.append("[%s] %d/q%d: 정규식 오류 %s" % (label, dn, qi, e))
                if q.get("re") and q.get("a"):
                    norm = re.sub(r"\s+", " ", q["a"][0]).strip()
                    norm = re.sub(r"^sudo\s+", "", norm)
                    if not any(re.search(p, norm, re.I) for p in q["re"]):
                        problems.append("[%s] %d/q%d: 모범답안이 자기 정규식에 안 맞음 -> %r"
                                        % (label, dn, qi, q["a"][0]))
            else:
                n_mcq += 1
                o = q.get("o") or []
                if len(o) < 3:
                    problems.append("[%s] %d/q%d: 보기 부족" % (label, dn, qi))
                if not isinstance(q.get("a"), int) or not (0 <= q["a"] < len(o)):
                    problems.append("[%s] %d/q%d: 정답 인덱스 이상" % (label, dn, qi))
                if len(set(o)) != len(o):
                    problems.append("[%s] %d/q%d: 보기 중복" % (label, dn, qi))

    lab_counts = [len(days[d]["lab"]) for d in nums]
    print("[%s] 실습 %d개 (최소 %d · 평균 %.1f · 최대 %d) · 문제 %d개 (객관식 %d · 입력 %d) · 보스 %d"
          % (label, sum(lab_counts), min(lab_counts), sum(lab_counts) / len(lab_counts),
             max(lab_counts), n_mcq + n_input, n_mcq, n_input,
             sum(1 for d in nums if days[d].get("boss"))))
    return acts, problems


def load_acts(*files):
    parts = [io.open(os.path.join(ROOT, "content", f), encoding="utf-8").read() for f in files]
    return js_to_data("".join(parts))


def main():
    # ── 방어 트랙 (기존 160일 + 패치) ──
    blue = load_acts(*["act%d.js" % i for i in range(0, 8)])
    all_labs = dict(patches.EXTRA_LABS)
    for k, v in patches_b.MORE_LABS.items():
        all_labs.setdefault(k, []).extend(v)
    all_q = {}
    for src in (patches_q.EXTRA_Q, patches_q2.MORE_Q, patches_q3.MORE_Q2, patches_q4.MORE_Q3,
                patches_ctf.CTF_Q, patches_ctf2.CTF_Q2):
        for k, v in src.items():
            all_q.setdefault(k, []).extend(v)
    blue, prob_b = merge_and_validate(blue, all_labs, all_q,
                                      patches_q.DAY_FILES, patches_q.DAY_FLAGS, "방어")

    # ── 공격 트랙 (레드팀 — 콘텐츠 자체 완결, 패치 없음) ──
    import glob as _glob
    red_files = sorted(os.path.basename(p) for p in
                       _glob.glob(os.path.join(ROOT, "content", "red*.js")))
    red, prob_r = load_acts(*red_files), []
    if red_files:
        red, prob_r = merge_and_validate(red, {}, {}, {}, {}, "공격")
    else:
        red = []

    problems = prob_b + prob_r
    if problems:
        print("\n문제 발견 %d건:" % len(problems))
        for p in problems[:40]:
            print("  -", p)
        sys.exit(1)
    print("검증 통과 — 문제 없음")

    j = lambda a: json.dumps(a, ensure_ascii=False, separators=(",", ":"))
    out = "const ACTS_BLUE=" + j(blue) + ";\nconst ACTS_RED=" + j(red) + ";\n"
    dst = os.path.join(ROOT, "public", "assets", "data.js")
    io.open(dst, "w", encoding="utf-8", newline="\n").write(out)
    print("\n생성: public/assets/data.js  (%.1f KB) — 방어 %d일 · 공격 %d일"
          % (len(out.encode()) / 1024,
             sum(len(a["days"]) for a in blue), sum(len(a["days"]) for a in red)))

    for src, dst in (("tools.js", "content-tools.js"), ("wargame.js", "content-wargame.js")):
        body = io.open(os.path.join(ROOT, "content", src), encoding="utf-8").read()
        io.open(os.path.join(ROOT, "public", dst), "w",
                encoding="utf-8", newline="\n").write(body)
        print("복사: content/%s -> public/%s  (%.1f KB)" % (src, dst, len(body.encode()) / 1024))

    stamp_assets()


def stamp_assets():
    """HTML 의 assets 참조에 ?v=<해시> 를 붙인다.

    이걸 안 하면 업데이트 후에도 브라우저가 낡은 app.js 를 계속 쓰고,
    새 data.js 와 짝이 안 맞아 앱이 깨진다. 파일이 바뀔 때만 값이 바뀐다."""
    import hashlib
    pub = os.path.join(ROOT, "public")
    adir = os.path.join(pub, "assets")
    h = hashlib.sha256()
    targets = [os.path.join(adir, n) for n in sorted(os.listdir(adir))]
    # content-*.js 도 HTML 이 직접 참조하므로 함께 해시한다.
    # 빠뜨리면 도구·워게임 데이터를 고쳐도 브라우저가 낡은 파일을 계속 쓴다.
    targets += [os.path.join(pub, n) for n in sorted(os.listdir(pub))
                if n.startswith("content-") and n.endswith(".js")]
    for t in targets:
        h.update(os.path.basename(t).encode())
        h.update(io.open(t, "rb").read())
    ver = h.hexdigest()[:10]

    pat = re.compile(r'((?:href|src)="(?:assets/|content-)[A-Za-z0-9_.-]+)(?:\?v=[0-9a-f]+)?(")')
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
