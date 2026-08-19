import { test, expect } from '@playwright/test';

test.describe('와노 전란기 v1 실제 사용자 흐름', () => {
  test('한국어 UI, 단일 클릭, 군단/수송/전투/저장 흐름이 동작한다', async ({ page }, testInfo) => {
    const errors=[];
    page.on('console',m=>{ if(m.type()==='error') errors.push(m.text()) });
    page.on('pageerror',e=>errors.push(e.message));

    await page.goto('/');
    await expect(page).toHaveTitle(/와노 전란기 v1/);
    await expect(page.getByText('전략 지도',{exact:true})).toBeVisible();
    await expect(page.getByText('몽키 D. 루피',{exact:true}).first()).toBeVisible();
    await expect(page.getByText('키비 주둔지',{exact:true}).last()).toBeVisible();

    // 한 번의 실제 클릭으로 다른 거점의 명령창이 열린다.
    await page.locator('[data-select="stronghold"][data-id="flower_capital"]').click();
    await expect(page.locator('.context h2')).toHaveText('꽃의 수도');

    await page.locator('[data-select="stronghold"][data-id="kibi_camp"]').click();
    await expect(page.locator('.context h2')).toHaveText('키비 주둔지');
    await expect(page.getByText('현재 거점 인물',{exact:true})).toBeVisible();

    // 내정 명령은 한 번 클릭으로 결과 피드백을 낸다.
    const troopsBefore=Number((await page.locator('.resource-row > div').filter({hasText:'병력'}).locator('strong').first().innerText()).replaceAll(',',''));
    await page.getByRole('button',{name:/병력 모집/}).click();
    await expect(page.locator('.ui-notice')).toContainText('병력');
    const troopsAfter=Number((await page.locator('.resource-row > div').filter({hasText:'병력'}).locator('strong').first().innerText()).replaceAll(',',''));
    expect(troopsAfter).toBeGreaterThan(troopsBefore);

    // 군단 편성: 루피 1,000명 → 에비스.
    const army=page.locator('form[data-form="army"]');
    await army.locator('select[name="commander"]').selectOption('luffy');
    await army.locator('select[name="destination"]').selectOption('ebisu');
    await army.locator('input[name="troops"]').fill('1000');
    await army.locator('input[name="food"]').fill('500');
    await army.getByRole('button',{name:'군단 출진'}).click();
    await expect(page.locator('.context h2')).toContainText('몽키 D. 루피 군단');

    // 다시 키비에서 수송대 편성: 나미가 식량 500을 아미가사로 수송.
    await page.locator('[data-select="stronghold"][data-id="kibi_camp"]').click();
    const transport=page.locator('form[data-form="transport"]');
    await transport.locator('select[name="commander"]').selectOption('nami');
    await transport.locator('select[name="destination"]').selectOption('amigasa');
    await transport.locator('input[name="food"]').fill('500');
    await transport.getByRole('button',{name:'수송 출발'}).click();
    await expect(page.locator('.context h2')).toContainText('나미 수송대');

    // 인물/특수 물품/외교 화면이 한국어로 접근 가능하다.
    await page.getByRole('button',{name:'인물',exact:true}).click();
    await expect(page.getByText('인물 일람',{exact:true})).toBeVisible();
    await page.locator('[data-select="character"][data-id="zoro"]').first().click();
    await expect(page.locator('.context h2')).toHaveText('롤로노아 조로');
    await expect(page.getByText('패기',{exact:true})).toBeVisible();
    await expect(page.getByText(/무장색/).first()).toBeVisible();

    await page.getByRole('button',{name:'특수 물품'}).click();
    await expect(page.getByText('악마의 열매',{exact:true}).first()).toBeVisible();
    await expect(page.getByText(/Hito Hito no Mi/).first()).toBeVisible();

    await page.getByRole('button',{name:'외교'}).click();
    await expect(page.locator('.context h2')).toHaveText('외교');
    await expect(page.getByRole('button',{name:'동맹'}).first()).toBeVisible();

    // 저장/불러오기.
    await page.getByRole('button',{name:'저장'}).click();
    await expect(page.locator('.ui-notice')).toContainText('저장');
    await page.getByRole('button',{name:'불러오기'}).click();
    await expect(page.locator('.ui-notice')).toContainText('불러');

    // 실시간 진행 후 루피 군단이 에비스에 도착하면 전투에 진입할 수 있다.
    await page.getByRole('button',{name:'3배속'}).click();
    await page.getByRole('button',{name:'전투',exact:true}).click();
    const manual=page.getByRole('button',{name:'수동 지휘'}).first();
    await expect(manual).toBeVisible({timeout:12_000});
    await manual.click();
    await expect(page.getByText('실시간 전술 전투',{exact:true})).toBeVisible();
    await expect(page.locator('.tactical-sprite').first()).toBeVisible();
    await page.getByRole('button',{name:'자동 전투로 전환'}).click();
    await expect(page.getByText('실시간 전술 전투',{exact:true})).toHaveCount(0);

    // 동적으로 생성된 사건 기록에서도 지명/인물명은 한국어로 보인다.
    const feedText=await page.locator('.feed').innerText();
    expect(feedText).not.toMatch(/Flower Capital|Mogura Port|Itachi Port|Tokage Port|Monkey D\. Luffy|Eustass Kid|Straw Hats|Kurozumi|Onigashima/);

    expect(errors,`브라우저 콘솔 오류: ${errors.join('\n')}`).toEqual([]);
    await page.screenshot({path:`test-results/${testInfo.project.name}-v1.png`,fullPage:true});
  });
});
