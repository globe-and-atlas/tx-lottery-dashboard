import os

with open("src/App.tsx", "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.strip() == "import './App.css';":
        new_lines.append("import './AppAlt.css';\n")
    elif line.strip() == "function App() {":
        new_lines.append("export default function AppAlt() {\n")
    elif line.strip() == "export default App;":
        pass
    else:
        new_lines.append(line)

return_start = -1
for i, line in enumerate(new_lines):
    if "return (" in line and i + 1 < len(new_lines) and "className=\"app-shell\"" in new_lines[i+1]:
        return_start = i
        break

if return_start == -1:
    print("Could not find start of return block!")
    exit(1)

header_part = new_lines[:return_start]

custom_jsx = """  return (
    <div className="terminal-shell">
      <header className="sys-header">
        <h1>TX_LOTTERY // SYS.OVERRIDE</h1>
        <div className="sys-meta">
          <span>SRC: TX LOTTERY PRIZE FILE</span>
          <span>DATE STR: {formatDate(dataset.source.csvAsOfDate)}</span>
          <span className="blink">STATUS: ONLINE</span>
        </div>
        <div className="t-stats-grid">
          <div className="t-stat"><span className="label">ACTIVE PROTOCOLS</span><span className="val">{number.format(dataset.summary.totalGames)}</span></div>
          <div className="t-stat"><span className="label">REMAINING_TOP</span><span className="val">{number.format(totalRemainingTopPrizes)}</span></div>
          <div className="t-stat"><span className="label">COVERAGE_RATIO</span><span className="val">{coverageWithApprox}/{rankedGames.length || dataset.summary.totalGames}</span></div>
        </div>
      </header>

      <section className="t-panel">
        <div className="t-controls">
          <div className="t-control-group">
            <label>QUERY_STR [GAME ID/NAME]</label>
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="AWAITING INPUT..." />
          </div>
          
          <div className="t-control-group">
            <label>LOCALE_ZIP</label>
            <div style={{display: "flex", gap: "8px"}}>
              <input type="text" value={zipCode} maxLength={5} 
                onChange={e => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))} />
              <button 
                className={`t-chip ${localSort ? 'active' : ''}`}
                onClick={() => setLocalSort(v => !v)}>LOCAL_SORT: {localSort ? 'ON' : 'OFF'}</button>
            </div>
          </div>
        </div>

        <div className="t-controls" style={{marginTop: "16px"}}>
          <div className="t-control-group">
            <label>PRICE_BAND</label>
            <div className="t-chips">
              <button className={`t-chip ${selectedPrice === 'all' ? 'active' : ''}`} onClick={() => setSelectedPrice('all')}>ALL</button>
              {dataset.summary.ticketPrices.map(p => (
                <button key={p} className={`t-chip ${selectedPrice === p ? 'active' : ''}`} onClick={() => setSelectedPrice(p)}>${p}</button>
              ))}
            </div>
          </div>

          <div className="t-control-group">
            <label>TARGET_VECTOR</label>
            <div className="t-chips">
              <button className={`t-chip ${objectiveMode === 'probability10x' ? 'active' : ''}`} onClick={() => setObjectiveMode('probability10x')}>PAYOUT_TARGET</button>
              <button className={`t-chip ${objectiveMode === 'jackpotTop' ? 'active' : ''}`} onClick={() => setObjectiveMode('jackpotTop')}>JACKPOT_TOP</button>
              <button className={`t-chip ${objectiveMode === 'bestReturn' ? 'active' : ''}`} onClick={() => setObjectiveMode('bestReturn')}>MAX_EV</button>
            </div>
            {objectiveMode === 'probability10x' && (
              <div style={{marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed var(--term-muted)"}}>
                <label>MIN_PAYOUT_MULT</label>
                <div className="t-chips">
                  {[2, 3, 5, 10, 20, 50].map(multiplier => (
                    <button 
                      key={multiplier} 
                      className={`t-chip ${targetPrizeMultiplier === multiplier ? 'active' : ''}`} 
                      onClick={() => setTargetPrizeMultiplier(multiplier)}>
                      {multiplier}X
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {bestGame && (
          <div className="t-highlight-row">
            <span className="k">SYSTEM RECOMMENDATION // OPTIMAL PULL</span>
            <span className="v">{bestGame.gameName} [N°{bestGame.gameNumber}] at {objectiveMode === 'bestReturn' ? `${formatPerDollar(rankingReturnForGame(bestGame))} EV` : formatOdds(rankingOddsForGame(bestGame))}</span>
          </div>
        )}
      </section>

      <div className="t-chips" style={{marginTop: "8px", marginBottom: "8px"}}>
        <button className={`t-chip ${workspaceView === 'buy' ? 'active' : ''}`} onClick={() => setWorkspaceView('buy')}>[ RUN_MATRIX_PLAN ]</button>
        <button className={`t-chip ${workspaceView === 'rank' ? 'active' : ''}`} onClick={() => setWorkspaceView('rank')}>[ VIEW_RANKINGS ]</button>
      </div>

      {workspaceView === 'buy' && (
        <section className="t-panel">
          <h2>MATRIX ALLOCATION_PLAN</h2>
          
          <div className="t-control-group" style={{marginBottom: "24px", padingBottom: "16px", borderBottom: "1px dashed var(--term-muted)"}}>
            <label>INPUT_FUNDS [CUSTOM_BUDGET]</label>
            <div style={{display: "flex", gap: "12px", alignItems: "center", marginTop: "8px"}}>
              <span style={{color: "var(--term-accent)", fontSize: "1.2rem"}}>$</span>
              <input type="text" value={customBudgetInput} onChange={e => {
                const next = e.target.value.replace(/\D/g, '').slice(0, 3);
                setCustomBudgetInput(next);
                if (!next) return;
                const parsed = Number.parseInt(next, 10);
                if (Number.isFinite(parsed) && parsed > 0) setEvPreviewBudget(Math.min(parsed, 500));
              }} placeholder="e.g. 15" className="alt-custom-budget" />
              <span style={{fontSize: "0.85rem", color: "var(--term-muted)"}}>{customBudgetValue ? `CALCULATING SCENARIO FOR $${customBudgetValue}...` : 'AWAITING FUND_INPUT'}</span>
            </div>
          </div>

          <div className="t-data-grid">
            {displayedBudgetPlans.map(({budget, finalPlan: plan}) => (
              <div key={budget} className={`t-card ${plan && plan.lines.length > 0 && budget >= (bestGame?.ticketPrice ?? 9999) ? 't-best' : ''}`}>
                <div className="t-card-header">
                  <span className="t-card-title">CREDIT: {currency.format(budget)}</span>
                </div>
                {plan ? (
                  <>
                    <div className="t-data-row"><span className="k">EXECUTE:</span><span className="v">{plan.lines.map((line) => `${line.ticketCount}x [${line.game.gameName}]`).join(' + ')}</span></div>
                    <div className="t-data-row"><span className="k">COST:</span><span className="v">{currency.format(plan.spent)}</span></div>
                    {plan.recommendationTarget === 'expectedValue' ? (
                      <>
                        <div className="t-data-row"><span className="k">EXPECTED_RETURN:</span><span className="v">{formatDollars(plan.estimatedExpectedPayout)}</span></div>
                        <div className="t-data-row"><span className="k">NET:</span><span className="v">{formatDollars(plan.estimatedExpectedNet)}</span></div>
                      </>
                    ) : (
                      <>
                        <div className="t-data-row"><span className="k">HIT_PROB:</span><span className="v">{percentage.format(plan.estimatedPrimaryChance)}</span></div>
                        <div className="t-data-row"><span className="k">TOP_HIT_PROB:</span><span className="v">{percentage.format(plan.estimatedTopPrizeChance)}</span></div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="t-data-row"><span className="k">ERROR:</span><span className="v">NO VIABLE MATCH</span></div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {workspaceView === 'rank' && (
        <section className="t-panel">
          <h2>GLOBAL_LEADERBOARD // {rankingModeLabel}</h2>
          <div className="t-table-wrapper">
            <table className="t-table">
              <thead>
                <tr>
                  <th>RK</th>
                  <th>ID</th>
                  <th>DESIGNATION</th>
                  <th>PRC</th>
                  <th>MAX_PAY</th>
                  <th>REM</th>
                  <th>BASE</th>
                  <th>L_BOUND</th>
                  <th>CF</th>
                  <th>MX</th>
                  <th>SCORE</th>
                </tr>
              </thead>
              <tbody>
                {rankedGames.map((game, i) => {
                  const rScore = rankingScoreForGame(game);
                  const baseMetric = objectiveMode === 'bestReturn' ? formatPerDollar(game.conservativeReturnPerDollar) : formatOdds(game.objectiveBaseOddsOneIn);
                  const lowerBoundMetric = objectiveMode === 'bestReturn' ? '-' : formatOdds(game.objectiveConservativeOddsOneIn);
                  const scoreStr = objectiveMode === 'bestReturn' ? (rScore ? formatPerDollar(rScore) : 'N/A') : (rScore ? formatOdds(probabilityToOdds(rScore)) : 'N/A');
                  const topPrizeLeft = number.format(game.topPrizesRemaining);
                  
                  return (
                    <tr key={game.gameNumber}>
                      <td><span className="t-rank">{i + 1}</span></td>
                      <td style={{color: "var(--term-accent)"}}>{game.gameNumber}</td>
                      <td>{game.gameName}</td>
                      <td>{currency.format(game.ticketPrice)}</td>
                      <td>{formatDollars(game.topPrizeAmount)}</td>
                      <td>{topPrizeLeft}</td>
                      <td>{baseMetric}</td>
                      <td>{lowerBoundMetric}</td>
                      <td>{percentage.format(game.confidenceFactor)}</td>
                      <td>{game.localBoostFactor > 1 ? `+${percentage.format(game.localBoostFactor - 1)}` : '-'}</td>
                      <td className="numeric">{scoreStr}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

    </div>
  );
}
"""

with open("src/AppAlt.tsx", "w") as f:
    f.writelines(header_part)
    f.write(custom_jsx)

print("Generated src/AppAlt.tsx successfully.")
