import { test, expect } from '@playwright/test';

test.describe('Wano Strategy Core V2 player experience',()=>{
  test('map-first monthly loop, real target selection, camera stability and save/load', async ({page},testInfo)=>{
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{ if(m.type()==='error') errors.push(m.text()) });
    const phone=testInfo.project.name.includes('iphone');
    await page.goto('/v2.html');
    await expect(page.getByText('와노 전란기').first()).toBeVisible();
    await expect(page.getByText('와노의 주도권을 장악하라')).toHaveCount(0);
    const kibi=page.getByRole('button',{name:'키비 주둔지',exact:true});
    await expect(kibi).toBeVisible();
    await kibi.click();
    if(phone){
      await expect(page.locator('.side-panel.left')).not.toHaveClass(/open/);
      await page.locator('[data-action="toggle-left"]').click();
      await expect(page.locator('.side-panel.left')).toHaveClass(/open/);
    }
    await expect(page.getByText('주둔 병력')).toBeAttached();
    await page.locator('[data-action="open-form-army"]').click();
    await expect(page.getByText('군단 편성').last()).toBeVisible();
    await page.locator('#form-troops').fill('1200');
    await page.locator('#form-supply').fill('120');
    await page.locator('[data-action="submit-form-army"]').click();
    await expect(page.getByText(/군단이 편성되었습니다/)).toBeVisible();

    await page.locator('[data-action="target-attack"]').first().click();
    await expect(page.locator('.target-hint')).toBeVisible();
    const bakura=page.getByRole('button',{name:'바쿠라',exact:true});
    await expect(bakura).toHaveClass(/target-valid/);
    await bakura.click();
    await expect(page.locator('.target-hint')).toHaveCount(0);
    await expect(page.getByText(/바쿠라.*ETA|ETA.*일/).first()).toBeVisible();
    await expect(page.locator('.list-item').filter({hasText:'바쿠라'}).first()).toBeAttached();

    await page.locator('[data-action="save"]').click();
    await expect(page.getByText('V2 캠페인을 저장했습니다.')).toBeVisible();

    const map=page.locator('#map-scroll');
    await map.evaluate(el=>{el.scrollLeft=Math.min(180,el.scrollWidth-el.clientWidth);el.scrollTop=Math.min(160,el.scrollHeight-el.clientHeight)});
    const before=await map.evaluate(el=>({x:el.scrollLeft,y:el.scrollTop}));
    await page.locator('[data-action="commit-month"]').click();
    await page.waitForTimeout(850);
    const during=await map.evaluate(el=>({x:el.scrollLeft,y:el.scrollTop}));
    expect(Math.abs(during.x-before.x)).toBeLessThanOrEqual(3);
    expect(Math.abs(during.y-before.y)).toBeLessThanOrEqual(3);

    await page.locator('[data-action="speed"][data-speed="4"]').click();
    const report=page.locator('.report-overlay.show');
    await expect(report).toBeVisible({timeout:20000});
    await expect(report.getByText(/월간 보고/).first()).toBeVisible();
    await page.locator('[data-action="next-month"]').click();
    await expect(page.getByText('2턴 · 30일째')).toBeVisible();

    await page.locator('[data-action="load"]').click();
    await expect(page.getByText('저장된 캠페인을 불러왔습니다.')).toBeVisible();
    await expect(page.getByText('1턴 · 0일째')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('iphone map zooms and selection does not auto-cover the battlefield', async ({page},testInfo)=>{
    test.skip(!testInfo.project.name.includes('iphone'));
    await page.goto('/v2.html');
    const map=page.locator('#map-scroll'),space=page.locator('#map-space');
    const before=await space.evaluate(el=>el.getBoundingClientRect().width);
    await page.locator('[data-action="map-zoom-in"]').click();
    const after=await space.evaluate(el=>el.getBoundingClientRect().width);
    expect(after).toBeGreaterThan(before+100);

    await page.getByRole('button',{name:'키비 주둔지',exact:true}).tap();
    await expect(page.locator('.side-panel.left')).not.toHaveClass(/open/);
    await expect(map).toBeVisible();
    await page.locator('[data-action="toggle-left"]').tap();
    await expect(page.locator('.side-panel.left')).toHaveClass(/open/);
    await page.locator('[data-action="toggle-left"]').tap();
    await expect(page.locator('.side-panel.left')).not.toHaveClass(/open/);
  });
});
