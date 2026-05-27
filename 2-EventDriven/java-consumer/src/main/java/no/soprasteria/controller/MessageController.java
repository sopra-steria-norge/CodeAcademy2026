package no.soprasteria.controller;

import no.soprasteria.db.DataRepository;
import no.soprasteria.domain.IdemDataDTO;
import no.soprasteria.rabbit.MessageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final DataRepository dataRepository;
    private final MessageService messageService;

    public MessageController(DataRepository dataRepository, MessageService fanOutMessageService) {
        this.dataRepository = dataRepository;
        this.messageService = fanOutMessageService;
    }

    @GetMapping("latest")
    public ResponseEntity<List<IdemDataDTO>> get() {
        return ResponseEntity.ok(dataRepository.findLatest()
                .stream()
                .map(message -> new IdemDataDTO(message.getId().toString(), message.getAuthor(), message.getMessage(), message.getCreatedAt()))
                .toList());
    }

    @PutMapping("post-new-message")
    public ResponseEntity<?> postMessage(@RequestBody Message message) {
        messageService.publishMessageToQueue(
            new IdemDataDTO(
                UUID.randomUUID().toString(),
                message.author(), message.message(),
                LocalDateTime.now()),
                "chat",
                "",
                "",
                Map.of("type", "message")
        );
        return ResponseEntity.accepted().build();
    }
}
