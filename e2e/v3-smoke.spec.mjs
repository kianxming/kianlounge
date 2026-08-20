import { test, expect } from '@playwright/test';

test.describe('Wano Kairo V3 vertical slice',()=>{
  test('village life, live scout, target-first sortie and character clash battle',async({page})=>{
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});

    await page.goto('/v3.html');
    await expect(page.getByText('꽃의 도시').first()).toBeVisible();
    await expect(page.locator('.chara')).toHaveCount(8);

    // Kairosoft-like construction: roads can be laid repeatedly without a separate resource system.
    const roadsBefore=await page.locator('.road').count();
    await page.getByRole('button',{name:/건설/}).click();
    await page.getByRole('button',{name:/길/}).click();
    await expect(page.locator('.road-cell').first()).toBeVisible();
    await page.locator('.road-cell').first().click();
    await expect(page.locator('.road')).toHaveCount(roadsBefore+1);
    await page.getByRole('button',{name:/길 배치 종료/}).click();

    // Characters actually use facilities and create village income/events.
    await page.waitForFunction(()=>window.__V3__?.sim?.facilities?.some(f=>f.uses>0),null,{timeout:10000});

    // Scout means watching the enemy settlement live, not dispatching a scout unit.
    await page.getByRole('button',{name:/세계/}).click();
    await page.getByRole('button',{name:/바쿠라/}).click();
    await page.getByRole('button',{name:'정찰'}).click();
    await expect(page.getByText('관찰 전용')).toBeVisible();
    await expect(page.locator('.scout .chara.readonly')).toHaveCount(3);
    await page.waitForFunction(()=>window.__V3__?.sim?.scout?.facilities?.some(f=>f.uses>0),null,{timeout:10000});
    await page.getByRole('button',{name:/세계지도/}).click();

    // Destination first -> unlimited character selection -> sortie, with real troop deduction.
    const troopsBefore=await page.evaluate(()=>window.__V3__.sim.availableTroops());
    await page.getByRole('button',{name:/바쿠라/}).click();
    await page.getByRole('button',{name:'공격'}).click();
    await page.getByRole('button',{name:/루피/}).click();
    await page.getByRole('button',{name:/조로/}).click();
    await page.getByRole('button',{name:'출정'}).click();
    await expect.poll(()=>page.evaluate(()=>window.__V3__.sim.availableTroops())).toBeLessThan(troopsBefore);
    await expect(page.getByText('군단 조우!')).toBeVisible({timeout:16000});
    await expect(page.getByText(/자동 일시정지/)).toBeVisible();
    await page.getByRole('button',{name:'전투 보기'}).click();
    await expect(page.getByText('⚔ 공격전')).toBeVisible();
    await expect(page.locator('.fighter.ally')).toHaveCount(2);

    // C control scheme: two characters can be assigned to the same named opponent.
    const luffy=page.locator('.fighter.ally').filter({hasText:'루피'});
    const zoro=page.locator('.fighter.ally').filter({hasText:'조로'});
    const jack=page.locator('.fighter.enemy').filter({hasText:'잭'});
    await luffy.click();await jack.click();
    await zoro.click();await jack.click();
    await expect(page.getByText(/2대1 협공|2:1 교전/).first()).toBeVisible();
    await page.getByRole('button',{name:/총공격/}).click();
    await expect(page.getByRole('button',{name:/총공격/})).toBeDisabled();
    await page.getByRole('button',{name:/필살기/}).click();

    expect(errors).toEqual([]);
  });

  test('treasure gifting, manual save and iphone compact UI work',async({page},testInfo)=>{
    await page.goto('/v3.html');
    await page.getByRole('button',{name:/메뉴/}).click();
    await page.getByRole('button',{name:/보물고/}).click();
    await page.getByRole('button',{name:/이글이글 열매/}).click();
    await page.locator('[data-gift-char="usopp"]').click();
    await expect(page.getByText(/우솝에게 이글이글 열매/)).toBeVisible();
    await page.getByRole('button',{name:'×'}).click();
    await page.getByRole('button',{name:/메뉴/}).click();
    await page.getByRole('button',{name:/저장/}).click();
    await expect(page.getByText('저장했습니다.')).toBeVisible();
    const saved=await page.evaluate(()=>localStorage.getItem('wano-kairo-v3-save'));
    expect(saved).toBeTruthy();

    if(testInfo.project.name.includes('iphone')){
      const widths=await page.evaluate(()=>({inner:innerWidth,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
      expect(widths.doc).toBeLessThanOrEqual(widths.inner+1);
      expect(widths.body).toBeLessThanOrEqual(widths.inner+1);
      await expect(page.locator('.bottom-nav')).toBeVisible();
      await page.getByRole('button',{name:/세계/}).tap();
      await page.getByRole('button',{name:/바쿠라/}).tap();
      await expect(page.locator('.mini.world-pop')).toBeVisible();
    }
    expect(errorsFromPage(page)).toEqual([]);
  });
});

function errorsFromPage(){return[];}
