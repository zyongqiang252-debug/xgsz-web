package com.cows.website;

import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Component;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/** Track only authenticated sessions, so account changes take effect immediately. */
@Component
public class WebsiteSessions implements jakarta.servlet.http.HttpSessionListener {
    private final Map<String,Set<HttpSession>> sessions=new ConcurrentHashMap<>();
    public void add(String username,HttpSession session){Object previous=session.getAttribute("website-username");if(previous!=null)remove(previous.toString(),session);session.setAttribute("website-username",username);sessions.computeIfAbsent(username,k->ConcurrentHashMap.newKeySet()).add(session);}
    public void revoke(String username){var active=sessions.remove(username);if(active!=null)for(var session:active)try{session.invalidate();}catch(IllegalStateException ignored){}}
    public void remove(String username,HttpSession session){var active=sessions.get(username);if(active!=null){active.remove(session);if(active.isEmpty())sessions.remove(username,active);}}
    @Override public void sessionDestroyed(jakarta.servlet.http.HttpSessionEvent event){Object username=event.getSession().getAttribute("website-username");if(username!=null)remove(username.toString(),event.getSession());}
}
