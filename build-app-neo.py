import os

with open("src/App.tsx", "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.strip() == "import './App.css';":
        new_lines.append("import './AppNeo.css';\n")
    elif line.strip() == "function App() {":
        new_lines.append("export default function AppNeo() {\n")
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
    <div className="neo-shell">
      <header className="neo-header">
        <h1>TX LOTTO<br/>PLAY ZONE</h1>
        <div className="neo-stats-grid">
          <div className="neo-stat"><span className="label">GAMES IN PLAY</span><span className="val">{number.format(dataset.summary.totalGames)}</span></div>
          <div className="neo-stat"><span className="label">JACKPOTS WAITING</span><span className="val">{number.format(totalRemainingTopPrizes)}</span></div>
          <div className="neo-stat"><span className="label">DATA CAPTURE</span><span className="val" style={{fontSize: "1.5rem", marginTop: "12px"}}>{formatDate(dataset.source.csvAsOfDate)}</span></div>
        </div>
      </header>

      <section className="neo-panel">
        <div className="neo-controls-grid">
          <div className="neo-control-group">
            <label>FIND A GAME</label>
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Type name or number..." />
          </div>
          
          <div className="neo-control-group">
            <label>YOUR ZIP CODE</label>
            <div style={{display: "flex", gap: "12px", alignItems: "center"}}>
              <input type="text" value={zipCode} maxLength={5} style={{width: "120px"}}
                onChange={e => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))} />
              <button 
                className={`neo-chip ${localSort ? 'active' : ''}`}
                onClick={() => setLocalSort(v => !v)}>LOCAL BOOST: {localSort ? 'ON!' : 'OFF'}</button>
            </div>
          </div>
        </div>

        <div className="neo-controls-grid" style={{marginTop: "30px"}}>
          <div className="neo-control-group">
            <label>TICKET_PRICE</label>
            <div className="neo-chips">
              <button className={`neo-chip ${selectedPrice === 'all' ? 'active' : ''}`} onClick={() => setSelectedPrice('all')}>ANY</button>
              {dataset.summary.ticketPrices.map(p => (
                <button key={p} className={`neo-chip ${selectedPrice === p ? 'active' : ''}`} onClick={() => setSelectedPrice(p)}>${p}</button>
              ))}
            </div>
          </div>

          <div className="neo-control-group">
            <label>WHAT'S THE GOAL?</label>
            <div className="neo-chips">
              <button className={`neo-chip ${objectiveMode === 'probability10x' ? 'active' : ''}`} onClick={() => setObjectiveMode('probability10x')}>WINNER</button>
              <button className={`neo-chip ${objectiveMode === 'jackpotTop' ? 'active' : ''}`} onClick={() => setObjectiveMode('jackpotTop')}>JACKPOT CHASE</button>
              <button className={`neo-chip ${objectiveMode === 'bestReturn' ? 'active' : ''}`} onClick={() => setObjectiveMode('bestReturn')}>BEST ROI</button>
            </div>
            {objectiveMode === 'probability10x' && (
              <>
                <label style={{marginTop: "8px"}}>MINIMUM WIN:</label>
                <div className="neo-chips">
                  {[2, 3, 5, 10, 20, 50].map(multiplier => (
                    <button 
                      key={multiplier} 
                      className={`neo-chip ${targetPrizeMultiplier === multiplier ? 'active' : ''}`} 
                      onClick={() => setTargetPrizeMultiplier(multiplier)}>
                      {multiplier}x TICK
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {bestGame && (
          <div className="neo-best-banner">
            <div className="badge">HOTTEST PICK 🔥</div>
            <div>
              Go buy <strong>{bestGame.gameName} [#{bestGame.gameNumber}]</strong>!<br/>
              It currently sits at {objectiveMode === 'bestReturn' ? `${formatPerDollar(rankingReturnForGame(bestGame))} EV` : formatOdds(rankingOddsForGame(bestGame))}
            </div>
          </div>
        )}
      </section>

      <div className="neo-main-tabs">
        <button className={`neo-chip ${workspaceView === 'buy' ? 'active' : ''}`} onClick={() => setWorkspaceView('buy')}>MONEY MOVES 💸</button>
        <button className={`neo-chip ${workspaceView === 'rank' ? 'active' : ''}`} onClick={() => setWorkspaceView('rank')}>LEADERBOARDS 🏆</button>
      </div>

      {workspaceView === 'buy' && (
        <section>
          <div className="neo-panel" style={{marginBottom: "20px", display: "flex", alignItems: "center", gap: "16px"}}>
            <label style={{fontWeight: 900, whiteSpace: "nowrap"}}>CUSTOM BANKROLL:</label>
            <span style={{fontSize: "1.5rem", fontWeight: 900}}></span>
            <input type="text" value={customBudgetInput} onChange={e => {
                const next = e.target.value.replace(/\D/g, '').slice(0, 3);
                setCustomBudgetInput(next);
                if (!next) return;
                const parsed = Number.parseInt(next, 10);
                if (Number.isFinite(parsed) && parsed > 0) setEvPreviewBudget(Math.min(parsed, 500));
              }} placeholder="0" className="neo-input" style={{width: "120px", textAlign: "center", padding: "8px", border: "3px solid var(--neo-fg)", borderRadius: "8px"}} />
            {customBudgetValue && <span style={{fontWeight: 700, color: "var(--neo-accent-2)"}}>ADDED TO LIST 👇</span>}
          </div>
          <div className="neo-card-grid">
            {displayedBudgetPlans.map(({budget, finalPlan: plan}) => (
              <div key={budget} className={`neo-card ${plan && budget >= (bestGame?.ticketPrice ?? 9999) ? 'best-card' : ''}`}>
                <div className="neo-card-header">
                  IF YOU HAVE {currency.format(budget)}
                </div>
                {plan ? (
                  <>
                    <h3 style={{fontSize: "1.2rem", color: "var(--neo-fg)", borderBottom: "none", marginBottom: "0"}}>{plan.lines.map((line) => `${line.ticketCount}x ${line.game.gameName}`).join(' & ')}</h3>
                    <div style={{height: "16px"}}></div>
                    <div className="neo-row"><span className="k">COST</span><span className="v">{currency.format(plan.spent)}</span></div>
                    {plan.recommendationTarget === 'expectedValue' ? (
                      <>
                        <div className="neo-row"><span className="k">EXP. PAYOUT</span><span className="v">{formatDollars(plan.estimatedExpectedPayout)}</span></div>
                        <div className="neo-row"><span className="k">AVG NET</span><span className="v">{formatDollars(plan.estimatedExpectedNet)}</span></div>
                      </>
                    ) : (
                      <>
                        <div className="neo-row"><span className="k">WIN CHANCE</span><span className="v">{percentage.format(plan.estimatedPrimaryChance)}</span></div>
                        <div className="neo-row"><span className="k">JACKPOT CHANCE</span><span className="v">{percentage.format(plan.estimatedTopPrizeChance)}</span></div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="neo-row" style={{border: "none"}}><span className="k">NO TICKETS FOUND 😭</span></div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {workspaceView === 'rank' && (
        <section className="neo-panel">
          <h2>THE LIST // {rankingModeLabel}</h2>
          <div className="neo-table-container">
            <table className="neo-table">
              <thead>
                <tr>
                  <th>RK</th>
                  <th>GAME TICKET</th>
                  <th>$$$</th>
                  <th>MAX PRIZE</th>
                  <th>LEFT</th>
                  <th>BASE ODDS</th>
                  <th>SCORE</th>
                </tr>
              </thead>
              <tbody>
                {rankedGames.map((game, i) => {
                  const rScore = rankingScoreForGame(game);
                  const baseMetric = objectiveMode === 'bestReturn' ? formatPerDollar(game.conservativeReturnPerDollar) : formatOdds(game.objectiveBaseOddsOneIn);
                  const scoreStr = objectiveMode === 'bestReturn' ? (rScore ? formatPerDollar(rScore) : 'N/A') : (rScore ? formatOdds(probabilityToOdds(rScore)) : 'N/A');
                  
                  return (
                    <tr key={game.gameNumber}>
                      <td><span className="neo-rank-badge">{i + 1}</span></td>
                      <td>
                        <strong style={{fontSize: "1.2rem", display: "block"}}>{game.gameName}</strong>
                        <span style={{fontSize: "0.8rem", background: "var(--neo-fg)", color: "white", padding: "2px 8px", borderRadius: "10px"}}>#{game.gameNumber}</span>
                      </td>
                      <td>{currency.format(game.ticketPrice)}</td>
                      <td>{formatDollars(game.topPrizeAmount)}</td>
                      <td>{number.format(game.topPrizesRemaining)}</td>
                      <td><span style={{background: "var(--neo-card-1)", padding: "4px 8px", borderRadius: "8px", border: "2px solid var(--neo-fg)"}}>{baseMetric}</span></td>
                      <td><span style={{background: "var(--neo-card-3)", padding: "4px 8px", borderRadius: "8px", border: "2px solid var(--neo-fg)", fontSize: "1.3rem", fontWeight: "900"}}>{scoreStr}</span></td>
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

with open("src/AppNeo.tsx", "w") as f:
    f.writelines(header_part)
    f.write(custom_jsx)

print("Generated src/AppNeo.tsx successfully.")
