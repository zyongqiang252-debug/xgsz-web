package com.cows.website;

import org.springframework.stereotype.Component;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@Component
public class WebsiteThrottle {
    private final Map<String,Deque<Long>> attempts=new HashMap<>();
    public synchronized void check(String key,int maximum){
        long cutoff=System.currentTimeMillis()-600_000;
        attempts.values().forEach(q->{while(!q.isEmpty()&&q.peekFirst()<cutoff)q.removeFirst();});
        attempts.values().removeIf(Deque::isEmpty);
        if(attempts.size()>10000)throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"请求过于频繁，请稍后重试");
        var q=attempts.computeIfAbsent(key,k->new ArrayDeque<>());
        if(q.size()>=maximum)throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"操作过于频繁，请10分钟后重试");
        q.addLast(System.currentTimeMillis());
    }
}
