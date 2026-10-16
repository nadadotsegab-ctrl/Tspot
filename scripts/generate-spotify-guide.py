"""Render the included Spotify guide without installing documentation dependencies."""
from pathlib import Path
from html import escape
import re
root=Path(__file__).resolve().parent.parent
source=(root/'docs/SPOTIFY-SETUP.md').read_text()
def inline(text):
 text=escape(text)
 text=re.sub(r'`([^`]+)`',r'<code>\1</code>',text)
 text=re.sub(r'\*\*([^*]+)\*\*',r'<strong>\1</strong>',text)
 text=re.sub(r'(?<!["\w])(https?://[^\s<]+)',lambda m:'<a href="'+m[1]+'">'+m[1]+'</a>',text)
 return text
parts=[];code=False;table=False
for line in source.splitlines():
 if line.startswith('```'):
  parts.append('</code></pre>' if code else '<pre><code>');code=not code;continue
 if code:parts.append(escape(line)+'\n');continue
 if line.startswith('|'):
  if not table:parts.append('<div class="table-scroll"><table>');table=True
  if re.match(r'^\|[\s|:-]+\|$',line):continue
  parts.append('<tr>'+''.join('<td>'+inline(cell.strip())+'</td>' for cell in line.strip('|').split('|'))+'</tr>');continue
 if table:parts.append('</table></div>');table=False
 if not line:continue
 if line.startswith('# '):parts.append('<h1>'+inline(line[2:])+'</h1>')
 elif line.startswith('## '):parts.append('<h2>'+inline(line[3:])+'</h2>')
 else:parts.append('<p>'+inline(line)+'</p>')
if table:parts.append('</table></div>')
head='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TSPOT · Spotify setup</title><style>body{font:16px/1.7 system-ui,sans-serif;max-width:850px;margin:40px auto;padding:0 24px;background:#11180f;color:#dce9d2}h1,h2{line-height:1.25;color:#b9f36c}h2{margin-top:45px}p{overflow-wrap:anywhere;margin:.8em 0}pre{background:#202c1a;border:1px solid #ffffff20;border-radius:8px;padding:20px;overflow:auto}a{color:#b9f36c}td{border:1px solid #ffffff25;padding:12px;vertical-align:top;font-size:14px}table{border-collapse:collapse}.table-scroll{overflow:auto}code{color:#b9f36c}strong{color:#f4fff0}</style><a href="/">← Back to TSPOT</a>'''
(root/'public/SPOTIFY-SETUP.html').write_text(head+''.join(parts)+'</html>')
