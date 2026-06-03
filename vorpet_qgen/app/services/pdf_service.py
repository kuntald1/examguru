"""
PDF Service — WeasyPrint 60.2
Fixed: proper fraction rendering for complex denominators like (m-2)²
"""
import re
import datetime


def frac(num: str, den: str) -> str:
    return (
        '<span class="frac">'
        '<span class="num">' + num + '</span>'
        '<span class="den"><span class="den-inner">' + den + '</span></span>'
        '</span>'
    )


def _convert_math(text: str) -> str:

    def to_sup(t):
        """Convert ^n and Unicode superscripts to HTML <sup> tags"""
        t = re.sub(r'\^(\w+)', r'<sup>\1</sup>', t)
        t = t.replace('²','<sup>2</sup>').replace('³','<sup>3</sup>').replace('⁴','<sup>4</sup>')
        return t

    def replace_frac(m):
        num = m.group(1).strip()
        den = m.group(2).strip()

        # Handle (expr)^n denominator — keep as one wrapped unit
        # e.g. (m-2)^2 → (m-2)<sup>2</sup> wrapped in nowrap span
        def format_den(d):
            # Match (expr)^n pattern
            paren_match = re.match(r'^(\([^)]+\))(\^[\w]+|[²³⁴])$', d)
            if paren_match:
                base = paren_match.group(1)
                exp = paren_match.group(2)
                exp_html = re.sub(r'\^(\w+)', r'<sup>\1</sup>', exp)
                exp_html = exp_html.replace('²','<sup>2</sup>').replace('³','<sup>3</sup>')
                return f'<span style="white-space:nowrap">{base}{exp_html}</span>'
            return to_sup(d)

        num_html = to_sup(num)
        den_html = format_den(den)

        num_html = num_html.replace('&','&amp;') if '&' in num_html and '<' not in num_html else num_html
        return frac(num_html, den_html)

    # Match FRAC(num, den) where den can be (expr)^n
    text = re.sub(
        r'FRAC\(([^,]+),(\([^)]+\)(?:\^[\w]+|[²³⁴])?|[^)]+)\)',
        replace_frac, text
    )
    # Convert remaining ^n to superscript
    text = re.sub(r'\^(\w+)', r'<sup>\1</sup>', text)
    # Convert remaining Unicode superscripts
    text = text.replace('²','<sup>2</sup>').replace('³','<sup>3</sup>').replace('⁴','<sup>4</sup>')
    text = text.replace('*', '×')
    # Remove Bengali full stop
    text = text.replace('।', '').replace('\u0964', '')
    return text


async def generate_pdf(questions: dict, school_name: str,
                       class_name: str, subject: str,
                       language: str, job_id: str,
                       duration_minutes: int = 90) -> str:

    from weasyprint import HTML
    from weasyprint.text.fonts import FontConfiguration

    print(f"PDF_SERVICE dur={duration_minutes}", flush=True)
    today  = datetime.date.today().strftime("%d/%m/%Y")
    school = school_name or "School Name"

    # Format duration nicely
    def format_duration(mins: int, lang: str) -> str:
        hrs = mins // 60
        rem = mins % 60
        bn = str.maketrans("0123456789", "০১২৩৪৫৬৭৮৯")
        b = lambda n: str(n).translate(bn)
        return str(mins) + " Minutes"

    time_str = format_duration(duration_minutes, language)

    # Collect all sections sorted by marks
    section_keys = sorted(
        [k for k in questions.keys() if k.endswith("_questions") and questions[k]],
        key=lambda k: int(k.split("_")[1])
    )

    # Compute total marks based on attempt counts
    total = 0
    for key in section_keys:
        marks = int(key.split("_")[1])
        qlist = questions[key]
        if qlist:
            attempt = qlist[0].get("attempt", len(qlist))
            total += attempt * marks

    # Section label alphabets per language
    sec_labels = {
        "bengali":  ["ক","খ","গ","ঘ","ঙ"],
        "hindi":    ["अ","ब","स","द","इ"],
        "english":  ["A","B","C","D","E"],
    }
    labels = sec_labels.get(language, ["A","B","C","D","E"])

    sec_name = {
        "bengali": "বিভাগ", "hindi": "खंड", "english": "Section",
    }.get(language, "Section")

    marks_word = {
        "bengali": "নম্বর", "hindi": "अंक", "english": "marks",
    }.get(language, "marks")

    exam_word = {
        "bengali": "প্রশ্নপত্র", "hindi": "प्रश्न पत्र", "english": "Question Paper",
    }.get(language, "Question Paper")

    def q_block(q_list, marks):
        html = ""
        for q in q_list:
            qtext = _convert_math(q.get("question", ""))
            answer = q.get("answer", "")
            html += (
                '<div class="question">'
                '<b>' + str(q["number"]) + '.</b> '
                + qtext +
                ' <span class="qmark">[' + str(marks) + ']</span>'
                '</div>'
            )
            if answer:
                ans_text = _convert_math(answer)
                html += (
                    '<div class="answer">'
                    '<span class="ans-label">' + {"bengali":"উত্তর","hindi":"उत्तर","english":"Answer"}.get(language,"Answer") + ":</span> "
                    + ans_text +
                    '</div>'
                )
            html += '<div class="gap"></div>'
        return html

    font_path = "/usr/share/fonts/truetype/noto/NotoSansBengali-Regular.ttf"
    font_face = "@font-face { font-family: 'BF'; src: url('file://" + font_path + "'); }"

    css = (
        font_face +
        "@page { size: A4; margin: 2cm 2.5cm; }"
        "body { font-family: 'BF', serif; font-size: 13px; color: #111; line-height: 1.9; }"
        ".frac { display:inline-table; text-align:center; vertical-align:middle; margin:0 3px; border-collapse:collapse; }"
        ".frac .num { display:table-row; border-bottom:1.2px solid #000; padding:0 4px 1px; font-size:0.85em; text-align:center; white-space:nowrap; }"
        ".frac .den { display:table-row; padding:1px 4px 0; font-size:0.85em; text-align:center; }"
        ".frac .den-inner { display:inline-block; white-space:nowrap; vertical-align:baseline; }"
        ".frac sup { font-size:0.75em; vertical-align:super; line-height:0; }"
        ".header { text-align:center; border-bottom:2.5px solid #111; padding-bottom:8px; margin-bottom:12px; }"
        ".school { font-size:19px; font-weight:bold; }"
        ".exam { font-size:15px; font-weight:bold; margin-top:3px; }"
        ".meta { display:flex; justify-content:space-between; font-size:12px; margin-top:8px; border-top:1px solid #555; padding-top:5px; }"
        ".instr { font-size:11px; border:1px dashed #aaa; padding:6px 12px; margin-bottom:12px; background:#fffbf0; }"
        ".attempt-instr { font-size:12px; color:#1a3a6e; font-style:italic; margin:4px 0 8px 4px; }"
        ".sec { background:#1a3a6e; color:white; padding:7px 12px; font-size:13px; font-weight:bold; margin:12px 0 4px; display:flex; justify-content:space-between; align-items:center; border-radius:3px; }"
        ".mbadge { font-size:11px; background:rgba(255,255,255,0.2); padding:2px 8px; border-radius:10px; font-weight:normal; }"
        ".question { display:block; padding:7px 12px; border:1px solid #e0e0e0; border-radius:4px; background:#fafafa; line-height:2.1; margin:8px 0 2px; }"
        ".answer { display:block; padding:6px 12px 6px 20px; border-left:3px solid #4CAF50; background:#F1F8E9; border-radius:0 4px 4px 0; font-size:12px; color:#1B5E20; line-height:1.8; margin-bottom:4px; }"
        ".ans-label { font-weight:700; color:#2E7D32; }"
        ".qmark { font-size:11px; color:#666; }"
        ".gap { height:6px; }"
        ".total { text-align:right; font-weight:bold; font-size:12px; color:#1a3a6e; margin:4px 0 8px; }"
        ".footer { border-top:1.5px solid #111; margin-top:20px; padding-top:6px; text-align:center; font-size:10px; color:#666; }"
    )

    # Build instruction line
    instr_parts = []
    for i, key in enumerate(section_keys):
        marks = int(key.split("_")[1])
        lbl = labels[i] if i < len(labels) else chr(65+i)
        instr_parts.append(sec_name + "-" + lbl + ": " + str(marks) + " " + marks_word)
    instr_line = " | ".join(instr_parts)

    # Build sections HTML
    sections_html = ""
    for i, key in enumerate(section_keys):
        marks = int(key.split("_")[1])
        qlist = questions[key]
        if not qlist:
            continue
        lbl = labels[i] if i < len(labels) else chr(65+i)
        first = qlist[0]
        total_q = first.get("total", len(qlist))
        attempt = first.get("attempt", total_q)
        attempt_instr = first.get("attempt_instruction", "")
        sec_total = attempt * marks

        sections_html += (
            '<div class="sec">'
            + sec_name + "-" + lbl
            + '<span class="mbadge">' + str(attempt) + " × " + str(marks) + " " + marks_word + " (" + str(total_q) + {
    "bengali": "টি থেকে",
    "hindi": " में से",
    "english": " to attempt",
}.get(language, " to attempt") + ")</span>"
            + '</div>'
        )
        if attempt_instr:
            sections_html += '<div class="attempt-instr">✏ ' + attempt_instr + '</div>'
        sections_html += q_block(qlist, marks)
        sections_html += '<div class="total">' + sec_name + "-" + lbl + " " + {"bengali":"মোট","hindi":"कुल","english":"Total"}.get(language,"Total") + " = " + str(sec_total) + '</div>'

    # Check if this is an answer key
    has_answers = any(
        any(q.get("answer") for q in questions.get(k, []))
        for k in questions
    )
    answer_key_label = " — " + {"bengali":"উত্তরপত্র (শিক্ষকের জন্য)","hindi":"उत्तर पत्र (शिक्षक के लिए)","english":"Answer Key (Teacher's Copy)"}.get(language,"Answer Key (Teacher's Copy)") if has_answers else ""

    html = (
        '<!DOCTYPE html><html><head><meta charset="UTF-8">'
        '<style>' + css + '</style>'
        '</head><body>'
        '<div class="header">'
        '<div class="school">' + school + '</div>'
        '<div class="exam">' + subject + ' — ' + exam_word + answer_key_label + '</div>'
        '<div class="meta">'
        '<span>' + {"bengali":"শ্রেণি","hindi":"कक्षा","english":"Class"}.get(language,"Class") + ': ' + class_name + '</span>'
        '<span>' + {"bengali":"তারিখ","hindi":"दिनांक","english":"Date"}.get(language,"Date") + ': ' + today + '</span>'
        '<span>' + {"bengali":"পূর্ণমান","hindi":"पूर्णांक","english":"Marks"}.get(language,"Marks") + ': ' + str(total) + '</span>'
        '<span>' + {"bengali":"সময়","hindi":"समय","english":"Time"}.get(language,"Time") + ': ' + time_str + '</span>'
        '</div></div>'
        '<div class="instr">' + {
    "bengali": "নির্দেশাবলী",
    "hindi": "निर्देश",
    "english": "Instructions",
}.get(language, "Instructions") + ": " + instr_line + '</div>'
        + sections_html +
        '<div class="total">' + {"bengali":"সর্বমোট","hindi":"कुल योग","english":"Grand Total"}.get(language,"Grand Total") + " = " + str(total) + '</div>'
        '<div class="footer">Vorpet AI — ' + {"bengali":"প্রশ্নপত্র জেনারেটর","hindi":"प्रश्न पत्र जनरेटर","english":"Question Paper Generator"}.get(language,"Question Paper Generator") + ' | vorpet.com</div>'
        '</body></html>'
    )

    out = "outputs/qpaper_" + job_id + ".pdf"
    fc = FontConfiguration()
    HTML(string=html).write_pdf(out, font_config=fc)
    return out
