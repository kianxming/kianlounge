from pathlib import Path

APP = Path('src/v2/ui/app.js')
CSS = Path('v2.css')

app = APP.read_text(encoding='utf-8')
old = "function restoreScroll(s){requestAnimationFrame(()=>{const map=$('#map-scroll'),left=$('.side-panel.left'),right=$('.side-panel.right');if(map){map.scrollLeft=s.mx;map.scrollTop=s.my}if(left)left.scrollTop=s.ly;if(right)right.scrollTop=s.ry})}"
new = "function restoreScroll(s){const apply=()=>{const map=$('#map-scroll'),left=$('.side-panel.left'),right=$('.side-panel.right');if(map){map.scrollLeft=s.mx;map.scrollTop=s.my}if(left)left.scrollTop=s.ly;if(right)right.scrollTop=s.ry};apply();requestAnimationFrame(apply)}"
if old not in app:
    raise SystemExit('missing restoreScroll hotfix anchor')
app = app.replace(old, new, 1)
APP.write_text(app, encoding='utf-8')

css = CSS.read_text(encoding='utf-8')
marker = '/* V2 closed mobile panels must never steal map/footer touches. */'
if marker not in css:
    css += '''\n\n/* V2 closed mobile panels must never steal map/footer touches. */\n@media(max-width:760px){\n  .side-panel.left{pointer-events:none;transform:translateY(115%)}\n  .side-panel.left.open{pointer-events:auto;transform:none}\n}\n'''
    CSS.write_text(css, encoding='utf-8')
